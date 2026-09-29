import type {
  CreatePortfolioEntryRequest,
  PortfolioEntry,
  PortfolioSummary,
} from '@fintrack/shared-types';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { setCoinGeckoMode } from '../../support/coingecko-mock.js';

// Mock-prijzen (e2e/fixtures/markets.json): bitcoin 65000, ethereum 3200, solana 150.

async function clearPortfolio(request: APIRequestContext): Promise<void> {
  const summary = (await (await request.get('/api/portfolio')).json()) as PortfolioSummary;
  for (const position of summary.positions) {
    await request.delete(`/api/portfolio/entries/${position.id}`);
  }
}

async function createEntry(
  request: APIRequestContext,
  data: CreatePortfolioEntryRequest,
): Promise<PortfolioEntry> {
  const response = await request.post('/api/portfolio/entries', { data });
  expect(response.status()).toBe(201);
  return (await response.json()) as PortfolioEntry;
}

test.beforeEach(async ({ request }) => {
  await clearPortfolio(request);
});

test.afterEach(async ({ request }) => {
  await setCoinGeckoMode(request, 'ok');
});

test('lege portfolio geeft nul-totalen', async ({ request }) => {
  const response = await request.get('/api/portfolio');

  expect(response.status()).toBe(200);
  const body = (await response.json()) as PortfolioSummary;
  expect(body.positions).toEqual([]);
  expect(body.totals).toEqual({
    costUsd: 0,
    valueUsd: 0,
    pnlUsd: 0,
    pnlPct: null,
    unpricedEntries: 0,
  });
});

test('volledige CRUD-flow met P&L-berekening', async ({ request }) => {
  const created = await createEntry(request, {
    coinId: 'bitcoin',
    amount: 0.5,
    buyPriceUsd: 50000,
    boughtAt: '2025-01-15T00:00:00.000Z',
    note: 'Eerste aankoop',
  });
  expect(created).toMatchObject({
    id: expect.any(String),
    coinId: 'bitcoin',
    amount: 0.5,
    buyPriceUsd: 50000,
    boughtAt: '2025-01-15T00:00:00.000Z',
    note: 'Eerste aankoop',
  });

  await createEntry(request, {
    coinId: 'ethereum',
    amount: 2,
    buyPriceUsd: 4000,
    boughtAt: '2025-02-01T00:00:00.000Z',
  });

  const summary = (await (await request.get('/api/portfolio')).json()) as PortfolioSummary;
  expect(summary.stale).toBe(false);
  expect(summary.positions.map((p) => [p.coinId, p.valueUsd, p.pnlUsd, p.pnlPct])).toEqual([
    ['bitcoin', 32500, 7500, 30],
    ['ethereum', 6400, -1600, -20],
  ]);
  expect(summary.totals).toEqual({
    costUsd: 33000,
    valueUsd: 38900,
    pnlUsd: 5900,
    pnlPct: 17.88,
    unpricedEntries: 0,
  });

  const patch = await request.patch(`/api/portfolio/entries/${created.id}`, {
    data: { amount: 1, note: 'Bijgekocht' },
  });
  expect(patch.status()).toBe(200);
  expect(await patch.json()).toMatchObject({ amount: 1, note: 'Bijgekocht', buyPriceUsd: 50000 });

  const remove = await request.delete(`/api/portfolio/entries/${created.id}`);
  expect(remove.status()).toBe(204);

  const after = (await (await request.get('/api/portfolio')).json()) as PortfolioSummary;
  expect(after.positions.map((p) => p.coinId)).toEqual(['ethereum']);
});

test.describe('validatie', () => {
  const valid: CreatePortfolioEntryRequest = {
    coinId: 'solana',
    amount: 10,
    buyPriceUsd: 100,
    boughtAt: '2025-01-01T00:00:00.000Z',
  };

  const invalidCases: [string, Record<string, unknown>][] = [
    ['negatief aantal', { amount: -1 }],
    ['aantal nul', { amount: 0 }],
    ['negatieve prijs', { buyPriceUsd: -5 }],
    ['datum in de toekomst', { boughtAt: '2999-01-01T00:00:00.000Z' }],
    ['ongeldige datum', { boughtAt: 'gisteren' }],
    ['ongeldige coin-id', { coinId: 'Bit Coin' }],
    ['te veel decimalen', { amount: 0.12345678901 }],
    ['onbekend veld', { extra: true }],
  ];

  for (const [label, override] of invalidCases) {
    test(`weigert ${label} met 400`, async ({ request }) => {
      const response = await request.post('/api/portfolio/entries', {
        data: { ...valid, ...override },
      });
      expect(response.status()).toBe(400);
    });
  }

  test('weigert een coin die CoinGecko niet kent met 400', async ({ request }) => {
    const response = await request.post('/api/portfolio/entries', {
      data: { ...valid, coinId: 'bestaat-niet' },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).message).toContain('bestaat-niet');
  });

  test('weigert een ongeldige id in het pad met 400', async ({ request }) => {
    const response = await request.patch('/api/portfolio/entries/geen-uuid', { data: {} });
    expect(response.status()).toBe(400);
  });
});

test('geeft 404 voor een onbekende entry', async ({ request }) => {
  const id = '00000000-0000-4000-8000-00000000abcd';

  expect((await request.patch(`/api/portfolio/entries/${id}`, { data: { note: 'x' } })).status()).toBe(
    404,
  );
  expect((await request.delete(`/api/portfolio/entries/${id}`)).status()).toBe(404);
});

test('toont de portfolio zonder waardering als CoinGecko uitvalt', async ({ request }) => {
  // Bij het aanmaken worden 'cardano' en 'tron' elk apart opgevraagd; de portfolio vraagt de
  // combinatie 'cardano,tron' op, waarvoor dus geen gecachte of eerdere prijzen bestaan.
  const base = { amount: 100, buyPriceUsd: 0.5, boughtAt: '2025-01-01T00:00:00.000Z' };
  await createEntry(request, { ...base, coinId: 'cardano' });
  await createEntry(request, { ...base, coinId: 'tron' });
  await setCoinGeckoMode(request, 'down');

  const response = await request.get('/api/portfolio');

  expect(response.status()).toBe(200);
  const body = (await response.json()) as PortfolioSummary;
  expect(body.stale).toBe(true);
  expect(body.pricesFetchedAt).toBeNull();
  expect(body.positions[0]).toMatchObject({ coinId: 'cardano', costUsd: 50, valueUsd: null });
  expect(body.totals.unpricedEntries).toBe(2);
});
