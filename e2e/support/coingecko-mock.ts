import type { APIRequestContext } from '@playwright/test';
import { coingeckoMockUrl } from './env.js';

export type MockMode = 'ok' | 'rate-limit' | 'down';

export async function setCoinGeckoMode(request: APIRequestContext, mode: MockMode): Promise<void> {
  const response = await request.post(`${coingeckoMockUrl}/__control/mode`, { data: { mode } });
  if (!response.ok()) {
    throw new Error(`Kon mock-modus niet op '${mode}' zetten: ${response.status()}`);
  }
}
