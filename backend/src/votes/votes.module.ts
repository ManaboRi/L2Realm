import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VotesService } from './votes.service';
import { VotePublicController, VotesController } from './votes.controller';

@Module({
  imports: [PrismaModule],
  controllers: [VotesController, VotePublicController],
  providers: [VotesService],
})
export class VotesModule {}
