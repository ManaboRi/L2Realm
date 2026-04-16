import { Module } from '@nestjs/common';
import { ServersService }    from './servers.service';
import { ServersController } from './servers.controller';
import { MonitoringModule }  from '../monitoring/monitoring.module';

@Module({
  imports:     [MonitoringModule],
  controllers: [ServersController],
  providers:   [ServersService],
  exports:     [ServersService],
})
export class ServersModule {}
