import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule }    from './prisma/prisma.module';
import { AuthModule }      from './auth/auth.module';
import { ServersModule }   from './servers/servers.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { PaymentsModule }  from './payments/payments.module';
import { UploadModule }    from './upload/upload.module';
import { VotesModule }     from './votes/votes.module';
import { ArticlesModule }  from './articles/articles.module';
import { OpeningRemindersModule } from './opening-reminders/opening-reminders.module';
import { OpeningWaitsModule } from './opening-waits/opening-waits.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Глобальный базовый лимит: 120 req/min с одного IP
    // Индивидуальные строгие лимиты — в контроллерах через @Throttle()
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    ServersModule,
    MonitoringModule,
    PaymentsModule,
    UploadModule,
    VotesModule,
    ArticlesModule,
    OpeningRemindersModule,
    OpeningWaitsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
