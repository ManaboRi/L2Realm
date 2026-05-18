import { Module } from '@nestjs/common';
import { OpeningRemindersController } from './opening-reminders.controller';
import { OpeningRemindersService } from './opening-reminders.service';

@Module({
  controllers: [OpeningRemindersController],
  providers: [OpeningRemindersService],
})
export class OpeningRemindersModule {}
