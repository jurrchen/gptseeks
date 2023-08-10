import { Module, forwardRef } from '@nestjs/common';
import { MessagesService } from '../relay/messages.service';
import { PubSubService } from './pubsub.service';
import { RoboticsService } from 'src/robotics/robotics.service';
import { RoboticsModule } from 'src/robotics/robotics.module';

@Module({
  providers: [MessagesService, PubSubService],
  exports: [MessagesService, PubSubService],
})
export class RelayModule {}
