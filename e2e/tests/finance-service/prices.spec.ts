import type { CoinHistory, CoinPrice, PriceResponse } from '@fintrack/shared-types';
import { expect, test } from '@playwright/test';
import { setCoinGeckoMode } from '../../support/coingecko-mock.js';

test.afterEach(async ({ request }) => {
  await setCoinGeckoMode(request, 'ok');
});

test.describe('GET /api/prices', () => {
  test('geeft de top-coins in CoinPrice-vorm', async ({ request }) => {
    const response = await request.get('/api/prices?limit=10');

    expect(response.status()).toBe(200);
    const body = (await response.json()) as PriceResponse<CoinPrice[]>;
    expect(body.stale).toBe(false);
    expect(body.data).toHaveLength(10);
    expect(body.data[0]).toEqual({
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      image: expect.any(String),
      currentPrice: 65000,
      marketCap: expect.any(Number),
      priceChange24hPct: expect.any(Number),
      lastUpdated: expect.any(String),
    });
  });

  test('gebruikt standaard een limiet van 20 (mock heeft er 12)', async ({ request }) => {
    const body = (await (await request.get('/api/prices')).json()) as PriceResponse<CoinPrice[]>;
    expect(body.data).toHaveLength(12);
  });

  for (const limit of ['0', '51', 'abc']) {
    test(`weigert limit=${limit} met 400`, async ({ request }) => {
      const response = await request.get(`/api/prices?limit=${limit}`);
      expect(response.status()).toBe(400);
    });
  }

  test('weigert onbekende query-parameters met 400', async ({ request }) => {
    const response = await request.get('/api/prices?foo=bar');
    expect(response.status()).toBe(400);
  });

  test('serveert verouderde data wanneer CoinGecko rate-limit, na verlopen van de cache', async ({
    request,
  }) => {
    const fresh = (await (await request.get('/api/prices?limit=3')).json()) as PriceResponse<
      CoinPrice[]
    >;
    // Cache-TTL is 1s in de e2e-omgeving.
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    await setCoinGeckoMode(request, 'rate-limit');

    const response = await request.get('/api/prices?limit=3');

    expect(response.status()).toBe(200);
    const body = (await response.json()) as PriceResponse<CoinPrice[]>;
    expect(body.stale).toBe(true);
    expect(body.data).toEqual(fresh.data);
  });

  test('geeft 503 als CoinGecko faalt en er geen eerdere data is', async ({ request }) => {
    await setCoinGeckoMode(request, 'down');

    const response = await request.get('/api/prices?limit=7');

    expect(response.status()).toBe(503);
  });
});

test.describe('GET /api/prices/:id/history', () => {
  test('geeft prijspunten voor een coin', async ({ request }) => {
    const response = await request.get('/api/prices/bitcoin/history?days=7');

    expect(response.status()).toBe(200);
    const body = (await response.json()) as PriceResponse<CoinHistory>;
    expect(body.data.id).toBe('bitcoin');
    expect(body.data.days).toBe(7);
    expect(body.data.prices.length).toBeGreaterThan(0);
    expect(body.data.prices[0]).toEqual({
      timestamp: expect.any(Number),
      price: expect.any(Number),
    });
  });

  test('geeft 404 voor een onbekende coin', async ({ request }) => {
    const response = await request.get('/api/prices/bestaat-niet/history');
    expect(response.status()).toBe(404);
  });

  test('weigert een ongeldige id met 400', async ({ request }) => {
    const response = await request.get('/api/prices/NOT_VALID/history');
    expect(response.status()).toBe(400);
  });

  test('weigert een niet-ondersteund aantal dagen met 400', async ({ request }) => {
    const response = await request.get('/api/prices/bitcoin/history?days=3');
    expect(response.status()).toBe(400);
  });
});
