import { Module, forwardRef } from '@nestjs/common';
import { RoboticsService } from './robotics.service';
import { MessagesModule } from 'src/messages/messages.module';
import { RelayModule } from 'src/relay/relay.module';
import { BotService } from './bot.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [RelayModule, ConfigModule],
  providers: [RoboticsService, BotService],
  exports: [RoboticsService],
})
export class RoboticsModule {}
