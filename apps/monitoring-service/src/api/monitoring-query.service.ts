import {
  MONITORED_TARGETS,
  type CheckSeries,
  type CheckStatus,
  type Incident,
  type MonitoredTarget,
  type MonitoringStatus,
  type TargetUptime,
  type UptimeWindow,
} from '@fintrack/shared-types';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type BucketRow,
  type UptimeRow,
  toCheckBucket,
  toIncident,
  toTargetUptime,
} from './mappers.js';
import { WINDOW_CONFIG, windowStart } from './windows.js';

/** Leesmodel voor het monitoring-dashboard. */
@Injectable()
export class MonitoringQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(now = new Date()): Promise<MonitoringStatus> {
    const targets = await Promise.all(
      MONITORED_TARGETS.map(async (target) => {
        const [last, openIncident] = await Promise.all([
          this.prisma.healthCheck.findFirst({ where: { target }, orderBy: { checkedAt: 'desc' } }),
          this.prisma.incident.findFirst({
            where: { target, resolvedAt: null },
            orderBy: { startedAt: 'desc' },
          }),
        ]);
        return {
          target,
          status: (last?.status as CheckStatus | undefined) ?? 'unknown',
          lastCheckedAt: last?.checkedAt.toISOString() ?? null,
          responseTimeMs: last?.responseTimeMs ?? null,
          error: last?.error ?? null,
          openIncident: openIncident ? toIncident(openIncident, now) : null,
        } as const;
      }),
    );
    return { generatedAt: now.toISOString(), targets };
  }

  /** Uptime = aandeel checks dat niet `down` was; responstijden via Postgres-aggregaten. */
  async getUptime(window: UptimeWindow, now = new Date()): Promise<TargetUptime[]> {
    const rows = await this.prisma.$queryRaw<UptimeRow[]>`
      SELECT target,
             count(*)::int                                            AS checks,
             count(*) FILTER (WHERE status <> 'down')::int            AS available,
             avg(response_time_ms)::float                             AS avg_ms,
             percentile_cont(0.95) WITHIN GROUP (ORDER BY response_time_ms)::float AS p95_ms
      FROM monitoring.health_checks
      WHERE checked_at >= ${windowStart(window, now)}
      GROUP BY target`;
    const byTarget = new Map(rows.map((row) => [row.target, row]));
    return MONITORED_TARGETS.map((target) => toTargetUptime(target, window, byTarget.get(target)));
  }

  /** Tijdreeks in vaste buckets (`date_bin`), met de slechtste status per bucket. */
  async getCheckSeries(
    target: MonitoredTarget,
    window: UptimeWindow,
    now = new Date(),
  ): Promise<CheckSeries> {
    const { bucketSeconds } = WINDOW_CONFIG[window];
    const rows = await this.prisma.$queryRaw<BucketRow[]>`
      SELECT date_bin(${bucketSeconds}::int * interval '1 second', checked_at, timestamp '2000-01-01')
               AS bucket_start,
             count(*)::int                AS checks,
             avg(response_time_ms)::float AS avg_ms,
             max(CASE status WHEN 'down' THEN 2 WHEN 'degraded' THEN 1 ELSE 0 END)::int AS worst
      FROM monitoring.health_checks
      WHERE target = ${target} AND checked_at >= ${windowStart(window, now)}
      GROUP BY 1
      ORDER BY 1`;
    return { target, window, bucketSeconds, buckets: rows.map(toCheckBucket) };
  }

  async getIncidents(limit: number, now = new Date()): Promise<Incident[]> {
    const records = await this.prisma.incident.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    return records.map((record) => toIncident(record, now));
  }
}
