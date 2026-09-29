import type { APIRequestContext } from '@playwright/test';
import { healthTargetMockUrl } from './env.js';

export type HealthTargetMode = 'ok' | 'degraded' | 'down';

/** Zet de nagebootste finance-service (die monitoring-service in e2e bewaakt) op een status. */
export async function setFinanceHealth(
  request: APIRequestContext,
  mode: HealthTargetMode,
): Promise<void> {
  const response = await request.post(`${healthTargetMockUrl}/__control/mode`, { data: { mode } });
  if (!response.ok()) {
    throw new Error(`Kon health-mock niet op '${mode}' zetten: ${response.status()}`);
  }
}
