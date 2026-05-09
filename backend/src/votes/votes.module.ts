import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { VotesService } from './votes.service';
import { VotePublicController, VotesController } from './votes.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [VotesController, VotePublicController],
  providers: [VotesService],
})
export class VotesModule {}
