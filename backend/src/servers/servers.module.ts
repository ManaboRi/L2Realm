import { Module } from '@nestjs/common';
import { ServersService }    from './servers.service';
import { ServersController } from './servers.controller';
import { MonitoringModule }  from '../monitoring/monitoring.module';
import { TelegramModule }    from '../telegram/telegram.module';

@Module({
  imports:     [MonitoringModule, TelegramModule],
  controllers: [ServersController],
  providers:   [ServersService],
  exports:     [ServersService],
})
export class ServersModule {}
