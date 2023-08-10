import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, Length, MaxLength } from 'class-validator';

@InputType()
export class NewMessageInput {
  @Field()
  @MaxLength(300)
  message: string;
}
