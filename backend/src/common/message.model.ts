import { Field, ID, ObjectType } from '@nestjs/graphql';

export type MessageSender = 'bot' | 'user';

@ObjectType({ description: 'message ' })
export class Message {
  @Field((type) => ID)
  id: string;

  @Field((type) => String)
  message: string;

  @Field({ nullable: true })
  sender: MessageSender;

  @Field()
  creation: Date;
}
