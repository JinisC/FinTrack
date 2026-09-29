import type { CheckStatus } from '@fintrack/shared-types';
import { MetricsRegistry } from '@fintrack/nest-observability';
import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram } from '@prometheus-io/client';
import type { CheckResult } from '../checks/check-result.js';

/** Numerieke waarde per status, zodat Prometheus/Grafana er drempels op kan zetten. */
const STATUS_VALUE: Record<CheckStatus, number> = { up: 1, degraded: 0.5, down: 0 };

@Injectable()
export class MonitoringMetricsService {
  readonly targetStatus: Gauge<'target'>;
  readonly targetResponseTime: Histogram<'target'>;
  readonly alertsSent: Counter<'type' | 'result'>;

  constructor(registry: MetricsRegistry) {
    const registers = [registry];

    this.targetStatus = new Gauge({
      name: 'monitored_target_status',
      help: 'Laatste status per bewaakte target (1 = up, 0.5 = degraded, 0 = down)',
      labelNames: ['target'] as const,
      registers,
    });

    this.targetResponseTime = new Histogram({
      name: 'monitored_target_response_seconds',
      help: 'Responstijd van bewaakte targets',
      labelNames: ['target'] as const,
      registers,
    });

    this.alertsSent = new Counter({
      name: 'monitoring_alerts_total',
      help: 'Verstuurde alerts per type (opened/resolved) en resultaat (sent/skipped/failed)',
      labelNames: ['type', 'result'] as const,
      registers,
    });
  }

  recordCheck(check: CheckResult): void {
    this.targetStatus.set({ target: check.target }, STATUS_VALUE[check.status]);
    if (check.responseTimeMs !== null) {
      this.targetResponseTime.observe({ target: check.target }, check.responseTimeMs / 1000);
    }
  }
}
