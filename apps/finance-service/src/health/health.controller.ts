import type { HealthReport } from '@fintrack/shared-types';
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Altijd 200 zolang de service zelf antwoordt; externe storingen geven status "degraded". */
  @Get()
  getHealth(): Promise<HealthReport> {
    return this.health.getReport();
  }
}
