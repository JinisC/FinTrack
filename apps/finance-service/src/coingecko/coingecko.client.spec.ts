import type { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { MetricsService } from '../metrics/metrics.service.js';
import { CoinGeckoClient } from './coingecko.client.js';
import { CoinGeckoError } from './coingecko.types.js';

function axiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } };
}

function axiosError(status: number): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('fail', 'ERR', config, undefined, {
    ...axiosResponse({}, status),
    config,
  });
}

async function counterValue(metrics: MetricsService, labels: Record<string, string>) {
  const { values } = await metrics.coingeckoRequests.get();
  return values.find((v) =>
    Object.entries(labels).every(([k, val]) => (v.labels as Record<string, unknown>)[k] === val),
  )?.value;
}

describe('CoinGeckoClient', () => {
  let http: { get: ReturnType<typeof vi.fn> };
  let metrics: MetricsService;
  let client: CoinGeckoClient;

  beforeEach(() => {
    http = { get: vi.fn() };
    metrics = new MetricsService();
    client = new CoinGeckoClient(http as unknown as HttpService, metrics);
  });

  it('vraagt de markets op met de juiste parameters', async () => {
    http.get.mockReturnValue(of(axiosResponse([{ id: 'bitcoin' }])));

    const result = await client.getMarkets(10);

    expect(result).toEqual([{ id: 'bitcoin' }]);
    expect(http.get).toHaveBeenCalledWith('/coins/markets', {
      params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: 10, page: 1 },
    });
    expect(await counterValue(metrics, { endpoint: 'markets', status: '200' })).toBe(1);
  });

  it('escapet de coin-id in het market_chart-pad', async () => {
    http.get.mockReturnValue(of(axiosResponse({ prices: [] })));

    await client.getMarketChart('a/b', 7);

    expect(http.get).toHaveBeenCalledWith('/coins/a%2Fb/market_chart', {
      params: { vs_currency: 'usd', days: 7 },
    });
  });

  it('vraagt actuele prijzen voor meerdere coins in één request op', async () => {
    http.get.mockReturnValue(of(axiosResponse({ bitcoin: { usd: 65000 } })));

    const result = await client.getSimplePrices(['bitcoin', 'ethereum']);

    expect(result).toEqual({ bitcoin: { usd: 65000 } });
    expect(http.get).toHaveBeenCalledWith('/simple/price', {
      params: { ids: 'bitcoin,ethereum', vs_currencies: 'usd' },
    });
  });

  it('gooit een CoinGeckoError met de HTTP-status bij een foutantwoord', async () => {
    http.get.mockReturnValue(throwError(() => axiosError(429)));

    const error = await client.getMarkets(5).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CoinGeckoError);
    expect((error as CoinGeckoError).status).toBe(429);
    expect(await counterValue(metrics, { endpoint: 'markets', status: '429' })).toBe(1);
  });

  it('telt netwerkfouten zonder antwoord als network_error', async () => {
    http.get.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));

    const error = await client.ping().catch((e: unknown) => e);

    expect((error as CoinGeckoError).status).toBeUndefined();
    expect(await counterValue(metrics, { endpoint: 'ping', status: 'network_error' })).toBe(1);
  });
});
