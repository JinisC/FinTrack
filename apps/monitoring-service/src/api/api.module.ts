import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller.js';
import { MonitoringQueryService } from './monitoring-query.service.js';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringQueryService],
})
export class ApiModule {}
