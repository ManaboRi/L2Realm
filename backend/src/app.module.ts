import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule }    from './prisma/prisma.module';
import { AuthModule }      from './auth/auth.module';
import { ServersModule }   from './servers/servers.module';
import { ReviewsModule }   from './reviews/reviews.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { PaymentsModule }  from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ServersModule,
    ReviewsModule,
    MonitoringModule,
    PaymentsModule,
  ],
})
export class AppModule {}
