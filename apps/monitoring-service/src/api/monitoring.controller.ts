import type {
  CheckSeries,
  Incident,
  MonitoringStatus,
  TargetUptime,
} from '@fintrack/shared-types';
import { Controller, Get, Query } from '@nestjs/common';
import {
  CheckSeriesQueryDto,
  IncidentsQueryDto,
  WindowQueryDto,
} from './dto/monitoring-query.dto.js';
import { MonitoringQueryService } from './monitoring-query.service.js';

@Controller()
export class MonitoringController {
  constructor(private readonly queries: MonitoringQueryService) {}

  @Get('status')
  getStatus(): Promise<MonitoringStatus> {
    return this.queries.getStatus();
  }

  @Get('uptime')
  getUptime(@Query() query: WindowQueryDto): Promise<TargetUptime[]> {
    return this.queries.getUptime(query.window);
  }

  @Get('checks')
  getChecks(@Query() query: CheckSeriesQueryDto): Promise<CheckSeries> {
    return this.queries.getCheckSeries(query.target, query.window);
  }

  @Get('incidents')
  getIncidents(@Query() query: IncidentsQueryDto): Promise<Incident[]> {
    return this.queries.getIncidents(query.limit);
  }
}
