import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { Message } from '../common/message.model';
import { NewMessageInput } from './message.dto';
import { MessagesService } from '../relay/messages.service';
import { PubSubService } from '../relay/pubsub.service';
import { RoboticsService } from 'src/robotics/robotics.service';

@Resolver((of) => Message)
export class MessagesResolver {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly pubSubService: PubSubService,
    private readonly roboticsService: RoboticsService,
  ) {}

  @Query((returns) => [Message])
  messages(): Promise<Message[]> {
    return this.messagesService.all();
  }

  // Receive user message
  @Mutation((returns) => Message)
  async sendMessage(
    @Args('message') messageInput: NewMessageInput,
  ): Promise<Message> {
    const message = await this.messagesService.create(
      messageInput.message,
      'user',
    );

    // Send message to robotics service
    await this.roboticsService.ingestMessage(message);
    return message;
  }

  @Mutation((returns) => Int, {
    name: 'clearAll',
  })
  async clearAll(): Promise<number> {
    return this.messagesService.clear();
  }

  @Subscription((returns) => Message, {
    name: 'newMessage',
  })
  newMessage() {
    return this.pubSubService.stream();
  }
}
