import {
  MONITORED_TARGETS,
  UPTIME_WINDOWS,
  type MonitoredTarget,
  type UptimeWindow,
} from '@fintrack/shared-types';
import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';

export class WindowQueryDto {
  @IsIn(UPTIME_WINDOWS)
  window: UptimeWindow = '24h';
}

export class CheckSeriesQueryDto extends WindowQueryDto {
  @IsIn(MONITORED_TARGETS)
  target: MonitoredTarget;
}

export class IncidentsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
