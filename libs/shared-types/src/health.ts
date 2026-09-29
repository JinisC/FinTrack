export type DependencyStatus = 'up' | 'down';

export interface DependencyCheck {
  status: DependencyStatus;
  /** Responstijd van de laatste check in milliseconden (niet voor interne checks). */
  responseTimeMs?: number;
  checkedAt: string;
  error?: string;
}

/**
 * Antwoord van `GET /health`.
 * - `degraded`: een externe afhankelijkheid (CoinGecko) faalt; de service blijft met cache/stale
 *   data bruikbaar (HTTP 200).
 * - `down`: een kritieke afhankelijkheid (database) faalt (HTTP 503).
 */
export interface HealthReport {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  memory: {
    rssMb: number;
    heapUsedMb: number;
  };
  dependencies: Record<string, DependencyCheck>;
}
