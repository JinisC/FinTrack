import type { DependencyCheck, HealthReport } from '@fintrack/shared-types';
import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PollerService } from '../checks/poller.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const BYTES_PER_MB = 1024 * 1024;

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly poller: PollerService,
  ) {}

  /**
   * `down` (503) als de database onbereikbaar is; `degraded` als de poller stilgevallen is
   * (er komen geen nieuwe checks binnen, maar de API met historiek werkt nog).
   */
  @Get()
  async getHealth(@Res({ passthrough: true }) res: Response): Promise<HealthReport> {
    const database = await this.checkDatabase();
    const poller = this.checkPoller();
    const status =
      database.status === 'down' ? 'down' : poller.status === 'down' ? 'degraded' : 'ok';
    if (status === 'down') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    const memory = process.memoryUsage();
    return {
      status,
      service: 'monitoring-service',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssMb: Math.round(memory.rss / BYTES_PER_MB),
        heapUsedMb: Math.round(memory.heapUsed / BYTES_PER_MB),
      },
      dependencies: { database, poller },
    };
  }

  private async checkDatabase(): Promise<DependencyCheck> {
    const started = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        responseTimeMs: Math.round(performance.now() - started),
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: 'down',
        responseTimeMs: Math.round(performance.now() - started),
        checkedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private checkPoller(): DependencyCheck {
    const { healthy, stale } = this.poller.isHealthy();
    return {
      status: healthy ? 'up' : 'down',
      checkedAt: new Date().toISOString(),
      ...(healthy ? {} : { error: `Geen recente checks voor: ${stale.join(', ')}` }),
    };
  }
}
