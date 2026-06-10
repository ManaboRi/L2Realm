import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannersModule {}
