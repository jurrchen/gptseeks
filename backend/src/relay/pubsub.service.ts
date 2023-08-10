import { PubSub } from 'graphql-subscriptions';
import { Message } from '../common/message.model';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PubSubService {
  private pubSub = new PubSub();

  async publish(message: Message) {
    await this.pubSub.publish('message', {
      newMessage: message,
    });
  }

  stream() {
    return this.pubSub.asyncIterator('message');
  }
}
