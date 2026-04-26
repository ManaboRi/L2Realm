import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';

@Module({
  imports:     [PrismaModule],
  controllers: [ArticlesController],
  providers:   [ArticlesService],
  exports:     [ArticlesService],
})
export class ArticlesModule {}
