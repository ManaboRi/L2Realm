import { Module } from '@nestjs/common';
import { OpeningWaitsController } from './opening-waits.controller';
import { OpeningWaitsService } from './opening-waits.service';

@Module({
  controllers: [OpeningWaitsController],
  providers: [OpeningWaitsService],
})
export class OpeningWaitsModule {}
