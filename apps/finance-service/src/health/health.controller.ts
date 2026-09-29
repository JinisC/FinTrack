import type { HealthReport } from '@fintrack/shared-types';
import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * 200 bij "ok" en "degraded" (CoinGecko-storing: service blijft bruikbaar),
   * 503 bij "down" (database onbereikbaar).
   */
  @Get()
  async getHealth(@Res({ passthrough: true }) res: Response): Promise<HealthReport> {
    const report = await this.health.getReport();
    if (report.status === 'down') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return report;
  }
}
