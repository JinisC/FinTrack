import type {
  CheckBucket,
  CheckStatus,
  Incident,
  MonitoredTarget,
  TargetUptime,
  UptimeWindow,
} from '@fintrack/shared-types';
import type { Incident as IncidentRecord } from '../generated/prisma/client.js';

export interface UptimeRow {
  target: string;
  checks: number;
  available: number;
  avg_ms: number | null;
  p95_ms: number | null;
}

export interface BucketRow {
  bucket_start: Date;
  checks: number;
  avg_ms: number | null;
  /** 0 = up, 1 = degraded, 2 = down */
  worst: number;
}

const STATUS_BY_SEVERITY: CheckStatus[] = ['up', 'degraded', 'down'];

export function toIncident(record: IncidentRecord, now = new Date()): Incident {
  const end = record.resolvedAt ?? now;
  return {
    id: record.id,
    target: record.target as MonitoredTarget,
    startedAt: record.startedAt.toISOString(),
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
    durationSeconds: Math.max(0, Math.round((end.getTime() - record.startedAt.getTime()) / 1000)),
    cause: record.cause,
    alertSent: record.alertSentAt !== null,
  };
}

/** Uptime per target; targets zonder checks in het venster krijgen `null`-waarden. */
export function toTargetUptime(
  target: MonitoredTarget,
  window: UptimeWindow,
  row: UptimeRow | undefined,
): TargetUptime {
  if (!row || row.checks === 0) {
    return {
      target,
      window,
      checks: 0,
      uptimePct: null,
      avgResponseTimeMs: null,
      p95ResponseTimeMs: null,
    };
  }
  return {
    target,
    window,
    checks: row.checks,
    uptimePct: round((row.available / row.checks) * 100, 2),
    avgResponseTimeMs: row.avg_ms === null ? null : Math.round(row.avg_ms),
    p95ResponseTimeMs: row.p95_ms === null ? null : Math.round(row.p95_ms),
  };
}

export function toCheckBucket(row: BucketRow): CheckBucket {
  return {
    bucketStart: row.bucket_start.toISOString(),
    checks: row.checks,
    avgResponseTimeMs: row.avg_ms === null ? null : Math.round(row.avg_ms),
    worstStatus: STATUS_BY_SEVERITY[row.worst] ?? 'down',
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
