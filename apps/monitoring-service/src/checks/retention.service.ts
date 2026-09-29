import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Houdt de tabel health_checks klein: oude checks weg, incidenten blijven bewaard. */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);
  private readonly retentionDays: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.retentionDays = config.get('RETENTION_DAYS', { infer: true });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOldChecks(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - this.retentionDays * DAY_MS);
    const { count } = await this.prisma.healthCheck.deleteMany({
      where: { checkedAt: { lt: cutoff } },
    });
    this.logger.log(`${count} checks ouder dan ${this.retentionDays} dagen verwijderd`);
    return count;
  }
}
