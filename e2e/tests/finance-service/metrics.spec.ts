import { expect, test } from '@playwright/test';
import { readMetric } from '../../support/metrics.js';

const scrape = async (request: import('@playwright/test').APIRequestContext) =>
  (await request.get('/metrics')).text();

test('GET /metrics levert Prometheus-tekstformaat met Node-standaardmetrics', async ({
  request,
}) => {
  const response = await request.get('/metrics');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/plain');
  const body = await response.text();
  expect(body).toContain('# TYPE process_cpu_user_seconds_total counter');
  expect(body).toContain('# TYPE http_request_duration_seconds histogram');
  expect(body).toContain('# TYPE coingecko_requests_total counter');
});

test('cache-hit-teller stijgt bij een tweede request binnen de TTL', async ({ request }) => {
  const hitsBefore = readMetric(await scrape(request), 'price_cache_hits_total{kind="markets"}');

  // Unieke limit zodat deze test zijn eigen cache-key heeft.
  await request.get('/api/prices?limit=11');
  await request.get('/api/prices?limit=11');

  const hitsAfter = readMetric(await scrape(request), 'price_cache_hits_total{kind="markets"}');
  expect(hitsAfter).toBe(hitsBefore + 1);
});

test('HTTP-metrics gebruiken het route-patroon, niet de concrete URL', async ({ request }) => {
  await request.get('/api/prices/bitcoin/history?days=1');

  const body = await scrape(request);
  expect(body).toContain('route="/api/prices/:id/history"');
  expect(body).not.toContain('route="/api/prices/bitcoin/history"');
});

test('CoinGecko-requests worden per endpoint en status geteld', async ({ request }) => {
  const sample = 'coingecko_requests_total{endpoint="markets",status="200"}';
  const before = readMetric(await scrape(request), sample);

  await request.get('/api/prices?limit=13');

  expect(readMetric(await scrape(request), sample)).toBe(before + 1);
});
