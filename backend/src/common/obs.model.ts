import { Bot } from 'mineflayer';
import { MessagesService } from 'src/relay/messages.service';

export default class Observer {
  code: string;
  error: Error;

  logs: string[] = [];

  constructor(private readonly m: MessagesService) {}

  setCode(code: string) {
    this.code = code;
    console.warn('===CODE===');
    console.warn(code);
    console.warn('==========');
  }

  setError(e: Error) {
    this.error = e;
  }

  chat(message: string) {
    console.warn(message);
    this.m.create(message, 'bot');
    this.logs.push(message);
  }
}
