import { Configuration, OpenAIApi } from 'openai';
import { PubSub } from 'graphql-subscriptions';
import { Message } from '../common/message.model';
import { Injectable } from '@nestjs/common';
import { MessagesService } from 'src/relay/messages.service';
import { ConfigService } from '@nestjs/config';
import { PLAN } from './prompts/plan';
import { BotService } from './bot.service';
import { CODE } from './prompts/code';
import { MINE } from './prompts/mine';
import { CLASSIFY } from './prompts/classify';
import { BOT_USERNAME } from '../common/types';
import { CRAFT } from './prompts/craft';

@Injectable()
export class RoboticsService {
  private openai: OpenAIApi;
  private openai4: OpenAIApi;

  constructor(
    private readonly messageService: MessagesService,
    private readonly botService: BotService,
    private readonly configService: ConfigService,
  ) {
    const configuration = new Configuration({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    this.openai = new OpenAIApi(configuration);

    const configuration2 = new Configuration({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      organization: this.configService.get<string>('OPENAI_ORGANIZATION'),
    });

    this.openai4 = new OpenAIApi(configuration2);

    this.botService.registerChat(async (username, message) => {
      if (username === BOT_USERNAME) return;

      const msg = await this.messageService.create(message, 'user');
      await this.ingestMessage(msg);
    });
  }

  async ingestMessage(message: Message) {
    // route based on FSM state
    const regex = /```javascript(.*?)```/gs;
    const match1 = regex.exec(message.message);
    if (message.message === '!leash') {
      await this.messageService.create('Coming to you', 'bot');
      await this.botService.leash();
    } else if (!match1) {
      await this.code(message);
    } else {
      const code = match1[1];
      await this.messageService.create('Running manually', 'bot');
      await this.messageService.create(code, 'bot');
      await this.botService.runCode(code);
    }
  }

  /**
   * Entry point for execution engine
   */
  private async code(message: Message) {
    await this.messageService.create('Classifying...', 'bot');
    const classifier = await this.openai4.createChatCompletion({
      model: CLASSIFY.model,
      messages: [
        { role: 'system', content: CLASSIFY.system },
        {
          role: 'user',
          content: message.message,
        },
      ],
    });

    const responseContent = classifier.data.choices[0].message.content || '';
    const parsed = JSON.parse(responseContent);

    switch (parsed.category) {
      case 'mine':
        await this.mine(message);
        return null;
      case 'craft':
        await this.craft(message);
        return null;
      default:
        await this.messageService.create('???...', 'bot');
        await this.misc(message);
        return null;
    }
  }

  private async mine(message: Message) {
    // classify
    await this.messageService.create(
      `Writing code to ${message.message}`,
      'bot',
    );

    const classifier = await this.openai4.createChatCompletion({
      model: MINE.model,
      messages: [
        { role: 'system', content: MINE.system },
        {
          role: 'user',
          content: MINE.user(
            this.botService.getBasicObservations(),
            message.message,
          ),
        },
      ],
    });

    const responseContent = classifier.data.choices[0].message.content || '';
    console.warn(classifier.data.usage.total_tokens);

    if (responseContent.trim().startsWith('Error:')) {
      const regex = /```json(.*?)```/gs;
      const match1 = regex.exec(responseContent);
      if (!match1) {
        throw new Error('No json found in response');
      }
      const error = match1[1];
      await this.messageService.create(error, 'bot');
      return null;
    } else {
      console.warn(responseContent);
      const regex = /```javascript(.*?)```/gs;
      const match1 = regex.exec(responseContent);
      if (!match1) {
        throw new Error('No code found in response');
      }
      const code = match1[1];

      const regex2 = /```json(.*?)```/gs;
      const match2 = regex2.exec(responseContent);
      if (!match2) {
        throw new Error('No explain found in response');
      }
      const explain = JSON.parse(match2[1]);

      await this.messageService.create('Executing...', 'bot');
      await this.messageService.create(explain.explain, 'bot');
      await this.messageService.create(explain.plan, 'bot');
      await this.messageService.create(code, 'bot');

      await this.botService.runCode(code);

      await this.messageService.create('Done...', 'bot');
    }
  }

  private async craft(message: Message) {
    // classify
    await this.messageService.create(
      `Writing code to ${message.message}`,
      'bot',
    );

    await this.messageService.create(
      this.botService.getBasicObservations(),
      'bot',
    );

    const classifier = await this.openai4.createChatCompletion({
      model: CRAFT.model,
      messages: [
        { role: 'system', content: CRAFT.system },
        {
          role: 'user',
          content: CRAFT.user(
            this.botService.getBasicObservations(),
            message.message,
          ),
        },
      ],
    });

    const responseContent = classifier.data.choices[0].message.content || '';
    console.warn(classifier.data.usage.total_tokens);

    if (responseContent.trim().startsWith('Error:')) {
      const regex = /```json(.*?)```/gs;
      const match1 = regex.exec(responseContent);
      if (!match1) {
        throw new Error('No json found in response');
      }
      const error = match1[1];
      await this.messageService.create(error, 'bot');
      return null;
    } else {
      console.warn(responseContent);
      const regex = /```javascript(.*?)```/gs;
      const match1 = regex.exec(responseContent);
      if (!match1) {
        throw new Error('No code found in response');
      }
      const code = match1[1];

      const regex2 = /```json(.*?)```/gs;
      const match2 = regex2.exec(responseContent);
      if (!match2) {
        throw new Error('No explain found in response');
      }
      const explain = JSON.parse(match2[1]);

      await this.messageService.create('Executing...', 'bot');
      await this.messageService.create(explain.explain, 'bot');
      await this.messageService.create(explain.plan, 'bot');
      await this.messageService.create(code, 'bot');

      await this.botService.runCode(code);

      await this.messageService.create('Done.', 'bot');
    }
  }

  private async misc(message: Message) {
    await this.messageService.create('Writing code...', 'bot');

    const classifier = await this.openai4.createChatCompletion({
      model: CODE.model,
      messages: [
        { role: 'system', content: CODE.system },
        {
          role: 'user',
          content: CODE.user(
            this.botService.getBasicObservations(),
            message.message,
          ),
        },
      ],
    });

    const responseContent = classifier.data.choices[0].message.content || '';

    await this.messageService.create(responseContent, 'bot');
    await this.messageService.create(
      `Tokens: ${classifier.data.usage.total_tokens}`,
      'bot',
    );

    const regex = /```javascript(.*?)```/gs;
    const match1 = regex.exec(responseContent);
    if (!match1) {
      throw new Error('No code found in response');
    }
    const code = match1[1];

    await this.messageService.create('Executing...', 'bot');
    await this.messageService.create(code, 'bot');

    await this.botService.runCode(code);

    await this.messageService.create('Done...', 'bot');
  }

  async plan(message: Message) {
    await this.messageService.create('Planning...', 'bot');

    console.warn('INGESTING MESSAGE', message);
    const classifier = await this.openai.createChatCompletion({
      model: PLAN.model,
      messages: [
        { role: 'system', content: PLAN.system },
        {
          role: 'user',
          content: PLAN.user(
            this.botService.getBasicObservations(),
            message.message,
          ),
        },
      ],
    });

    await this.messageService.create(
      classifier.data.choices[0].message.content || '',
      'bot',
    );

    console.warn(classifier.data.usage.total_tokens);
  }
}
