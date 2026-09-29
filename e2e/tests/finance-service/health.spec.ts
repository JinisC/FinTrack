import type { HealthReport } from '@fintrack/shared-types';
import { expect, test } from '@playwright/test';
import { setCoinGeckoMode } from '../../support/coingecko-mock.js';

test.afterEach(async ({ request }) => {
  await setCoinGeckoMode(request, 'ok');
});

test('GET /health meldt ok als CoinGecko bereikbaar is', async ({ request }) => {
  const response = await request.get('/health');

  expect(response.status()).toBe(200);
  const body = (await response.json()) as HealthReport;
  expect(body).toMatchObject({
    status: 'ok',
    service: 'finance-service',
    dependencies: { coingecko: { status: 'up' } },
  });
  expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  expect(body.memory.heapUsedMb).toBeGreaterThan(0);
});

test('GET /health blijft 200 maar meldt degraded als CoinGecko faalt', async ({ request }) => {
  await setCoinGeckoMode(request, 'down');

  const response = await request.get('/health');

  expect(response.status()).toBe(200);
  const body = (await response.json()) as HealthReport;
  expect(body.status).toBe('degraded');
  expect(body.dependencies.coingecko.status).toBe('down');
  expect(body.dependencies.coingecko.error).toContain('500');
});

test('/health staat niet onder de /api-prefix', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(404);
});
