export const MONITORED_TARGETS = ['finance-service', 'coingecko'] as const;
export type MonitoredTarget = (typeof MONITORED_TARGETS)[number];

export type CheckStatus = 'up' | 'degraded' | 'down';

export const UPTIME_WINDOWS = ['24h', '7d', '30d'] as const;
export type UptimeWindow = (typeof UPTIME_WINDOWS)[number];

export interface Incident {
  id: string;
  target: MonitoredTarget;
  startedAt: string;
  /** null zolang het incident loopt. */
  resolvedAt: string | null;
  /** Duur tot herstel, of tot nu voor een lopend incident. */
  durationSeconds: number;
  cause: string;
  alertSent: boolean;
}

export interface TargetStatus {
  target: MonitoredTarget;
  /** `unknown` zolang er nog geen check is gebeurd. */
  status: CheckStatus | 'unknown';
  lastCheckedAt: string | null;
  responseTimeMs: number | null;
  error: string | null;
  openIncident: Incident | null;
}

/** `GET /api/status` */
export interface MonitoringStatus {
  generatedAt: string;
  targets: TargetStatus[];
}

/** `GET /api/uptime?window=…` — `up` en `degraded` tellen als beschikbaar. */
export interface TargetUptime {
  target: MonitoredTarget;
  window: UptimeWindow;
  checks: number;
  uptimePct: number | null;
  avgResponseTimeMs: number | null;
  p95ResponseTimeMs: number | null;
}

export interface CheckBucket {
  bucketStart: string;
  checks: number;
  avgResponseTimeMs: number | null;
  /** Slechtste status binnen de bucket (down > degraded > up). */
  worstStatus: CheckStatus;
}

/** `GET /api/checks?target=…&window=…` */
export interface CheckSeries {
  target: MonitoredTarget;
  window: UptimeWindow;
  bucketSeconds: number;
  buckets: CheckBucket[];
}
