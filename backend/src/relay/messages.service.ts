import { Injectable } from '@nestjs/common';
import { NewMessageInput } from '../messages/message.dto';
import { Message, MessageSender } from '../common/message.model';
import { Observable, Subject, scan, startWith, firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { InjectRedis, DEFAULT_REDIS_NAMESPACE } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import { PubSubService } from './pubsub.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly pubSubService: PubSubService,
  ) {}

  async create(message: string, sender: MessageSender): Promise<Message> {
    const id = uuidv4();
    const mObj: Message = {
      id,
      message,
      sender,
      creation: new Date(),
    };
    await this.redis.hset('messages', id, JSON.stringify(mObj));
    await this.redis.rpush('conversation', id);

    await this.pubSubService.publish(mObj);

    return mObj;
  }

  async clear(): Promise<number> {
    await this.redis.del('messages');
    return await this.redis.del('conversation');
  }

  async all(): Promise<Message[]> {
    const messages = await this.redis.hgetall('messages');
    const conversation = await this.redis.lrange('conversation', 0, -1);
    const hydrated = conversation.map((id) => {
      const m = JSON.parse(messages[id]);
      m.creation = new Date(m.creation);
      return m;
    });
    return hydrated;
  }
}
