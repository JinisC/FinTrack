export type DependencyStatus = 'up' | 'down';

export interface DependencyCheck {
  status: DependencyStatus;
  /** Responstijd van de laatste check in milliseconden. */
  responseTimeMs: number;
  checkedAt: string;
  error?: string;
}

/**
 * Antwoord van `GET /health`. `degraded` betekent dat de service zelf draait, maar een
 * externe afhankelijkheid faalt — de service blijft dan (met cache/stale data) bruikbaar.
 */
export interface HealthReport {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  memory: {
    rssMb: number;
    heapUsedMb: number;
  };
  dependencies: Record<string, DependencyCheck>;
}
