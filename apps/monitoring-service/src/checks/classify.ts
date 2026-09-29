import type { HealthReport } from '@fintrack/shared-types';
import type { Classification, ProbeResponse } from './check-result.js';

/**
 * Vertaalt het antwoord van finance-service `/health` naar een status.
 * - 200 + `ok` → up
 * - 200 + `degraded` → degraded (een afhankelijkheid zoals CoinGecko faalt)
 * - 503 / `down` / ander antwoord / geen antwoord → down
 */
export function classifyFinanceHealth(response: ProbeResponse | null, error?: string): Classification {
  if (!response) {
    return { status: 'down', error: error ?? 'Geen antwoord' };
  }
  const report = response.body as Partial<HealthReport> | null;
  const failing = failingDependencies(report);

  if (response.httpStatus === 200 && report?.status === 'ok') {
    return { status: 'up', error: null };
  }
  if (response.httpStatus === 200 && report?.status === 'degraded') {
    return { status: 'degraded', error: failing ?? 'Degraded' };
  }
  const detail = failing ? `: ${failing}` : '';
  return { status: 'down', error: `HTTP ${response.httpStatus}${detail}` };
}

/**
 * Vertaalt het antwoord van CoinGecko `/ping`. Een rate limit (429) betekent dat de API
 * bereikbaar is maar ons tijdelijk weigert: degraded, geen incident.
 */
export function classifyCoinGeckoPing(response: ProbeResponse | null, error?: string): Classification {
  if (!response) {
    return { status: 'down', error: error ?? 'Geen antwoord' };
  }
  if (response.httpStatus === 200) {
    return { status: 'up', error: null };
  }
  if (response.httpStatus === 429) {
    return { status: 'degraded', error: 'Rate limit (HTTP 429)' };
  }
  return { status: 'down', error: `HTTP ${response.httpStatus}` };
}

/** Bv. "database down, coingecko down" — of null als er niets faalt of het rapport onleesbaar is. */
function failingDependencies(report: Partial<HealthReport> | null): string | null {
  const dependencies = report?.dependencies;
  if (!dependencies || typeof dependencies !== 'object') return null;
  const failing = Object.entries(dependencies)
    .filter(([, check]) => check?.status === 'down')
    .map(([name]) => `${name} down`);
  return failing.length > 0 ? failing.join(', ') : null;
}
