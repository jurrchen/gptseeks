import { Module, forwardRef } from '@nestjs/common';
import { MessagesResolver } from './messages.resolver';
import { MessagesService } from '../relay/messages.service';
import { PubSubService } from '../relay/pubsub.service';
import { RoboticsService } from 'src/robotics/robotics.service';
import { RoboticsModule } from 'src/robotics/robotics.module';
import { RelayModule } from 'src/relay/relay.module';

@Module({
  imports: [RoboticsModule, RelayModule],
  providers: [MessagesResolver],
})
export class MessagesModule {}
