import type { MonitoredTarget } from '@fintrack/shared-types';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { IncidentsService } from '../incidents/incidents.service.js';
import { MonitoringMetricsService } from '../metrics/monitoring-metrics.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TargetProberService } from './target-prober.service.js';
import { type TargetDefinition, buildTargets } from './targets.js';

/** Pollt elke target op zijn eigen interval en verwerkt het resultaat. */
@Injectable()
export class PollerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PollerService.name);
  readonly targets: TargetDefinition[];
  private readonly inFlight = new Set<MonitoredTarget>();
  private readonly lastPolledAt = new Map<MonitoredTarget, Date>();
  private startedAt = new Date();

  constructor(
    private readonly prober: TargetProberService,
    private readonly prisma: PrismaService,
    private readonly incidents: IncidentsService,
    private readonly metrics: MonitoringMetricsService,
    private readonly scheduler: SchedulerRegistry,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.targets = buildTargets({
      FINANCE_SERVICE_URL: config.get('FINANCE_SERVICE_URL', { infer: true }),
      COINGECKO_BASE_URL: config.get('COINGECKO_BASE_URL', { infer: true }),
      COINGECKO_API_KEY: config.get('COINGECKO_API_KEY', { infer: true }),
      POLL_INTERVAL_SECONDS: config.get('POLL_INTERVAL_SECONDS', { infer: true }),
      COINGECKO_POLL_INTERVAL_SECONDS: config.get('COINGECKO_POLL_INTERVAL_SECONDS', {
        infer: true,
      }),
    });
  }

  onApplicationBootstrap(): void {
    this.startedAt = new Date();
    for (const target of this.targets) {
      void this.poll(target);
      const interval = setInterval(() => void this.poll(target), target.intervalSeconds * 1000);
      this.scheduler.addInterval(`poll:${target.name}`, interval);
      this.logger.log(`${target.name} wordt elke ${target.intervalSeconds}s gepolld (${target.url})`);
    }
  }

  /**
   * True als elke target recent gepolld werd (binnen 3 intervallen). Vlak na het opstarten
   * rekenen we vanaf de starttijd, zodat de service niet meteen "stilgevallen" lijkt.
   */
  isHealthy(now = new Date()): { healthy: boolean; stale: MonitoredTarget[] } {
    const stale = this.targets
      .filter((target) => {
        const last = this.lastPolledAt.get(target.name) ?? this.startedAt;
        return now.getTime() - last.getTime() > target.intervalSeconds * 3 * 1000;
      })
      .map((target) => target.name);
    return { healthy: stale.length === 0, stale };
  }

  private async poll(target: TargetDefinition): Promise<void> {
    // Een trage check mag niet overlappen met de volgende (dubbele incidenten/alerts).
    if (this.inFlight.has(target.name)) {
      this.logger.warn(`Vorige check van ${target.name} loopt nog; deze beurt overgeslagen`);
      return;
    }
    this.inFlight.add(target.name);
    try {
      const check = await this.prober.probe(target);
      this.metrics.recordCheck(check);
      await this.prisma.healthCheck.create({
        data: {
          target: check.target,
          checkedAt: check.checkedAt,
          status: check.status,
          responseTimeMs: check.responseTimeMs,
          httpStatus: check.httpStatus,
          error: check.error,
        },
      });
      await this.incidents.handleCheck(check);
      this.lastPolledAt.set(target.name, check.checkedAt);
    } catch (err) {
      this.logger.error(`Check van ${target.name} kon niet verwerkt worden: ${String(err)}`);
    } finally {
      this.inFlight.delete(target.name);
    }
  }
}
