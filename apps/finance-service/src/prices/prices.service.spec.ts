import type { Cache } from '@nestjs/cache-manager';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCache } from 'cache-manager';
import type { CoinGeckoClient } from '../coingecko/coingecko.client.js';
import { CoinGeckoError, type CoinGeckoMarket } from '../coingecko/coingecko.types.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { PricesService } from './prices.service.js';

const bitcoin: CoinGeckoMarket = {
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  image: 'https://example.com/btc.png',
  current_price: 65000,
  market_cap: 1_280_000_000_000,
  price_change_percentage_24h: -1.5,
  last_updated: '2026-09-29T10:00:00.000Z',
};

describe('PricesService', () => {
  let coingecko: Record<'getMarkets' | 'getMarketChart' | 'getSimplePrices', ReturnType<typeof vi.fn>>;
  let cache: Cache;
  let metrics: MetricsService;
  let service: PricesService;

  const counter = async (c: MetricsService['priceCacheHits'], kind: string) =>
    (await c.get()).values.find((v) => v.labels.kind === kind)?.value ?? 0;

  beforeEach(() => {
    coingecko = { getMarkets: vi.fn(), getMarketChart: vi.fn(), getSimplePrices: vi.fn() };
    cache = createCache() as Cache;
    metrics = new MetricsService();
    service = new PricesService(
      coingecko as unknown as CoinGeckoClient,
      cache,
      metrics,
      new ConfigService({ CACHE_TTL_SECONDS: 60 }),
    );
  });

  it('mapt CoinGecko-markets naar CoinPrice', async () => {
    coingecko.getMarkets.mockResolvedValue([bitcoin]);

    const result = await service.getTopCoins(1);

    expect(result.stale).toBe(false);
    expect(result.data).toEqual([
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        image: 'https://example.com/btc.png',
        currentPrice: 65000,
        marketCap: 1_280_000_000_000,
        priceChange24hPct: -1.5,
        lastUpdated: '2026-09-29T10:00:00.000Z',
      },
    ]);
  });

  it('beantwoordt een tweede request binnen de TTL uit de cache', async () => {
    coingecko.getMarkets.mockResolvedValue([bitcoin]);

    await service.getTopCoins(1);
    await service.getTopCoins(1);

    expect(coingecko.getMarkets).toHaveBeenCalledTimes(1);
    expect(await counter(metrics.priceCacheMisses, 'markets')).toBe(1);
    expect(await counter(metrics.priceCacheHits, 'markets')).toBe(1);
  });

  it('geeft verouderde data terug als CoinGecko faalt na het verlopen van de cache', async () => {
    coingecko.getMarkets.mockResolvedValueOnce([bitcoin]);
    const fresh = await service.getTopCoins(1);
    await cache.clear();
    coingecko.getMarkets.mockRejectedValueOnce(new CoinGeckoError('markets', 429));

    const result = await service.getTopCoins(1);

    expect(result).toEqual({ ...fresh, stale: true });
    expect(await counter(metrics.priceStaleResponses, 'markets')).toBe(1);
  });

  it('gooit 503 als CoinGecko faalt en er geen eerdere data is', async () => {
    coingecko.getMarkets.mockRejectedValue(new CoinGeckoError('markets', undefined));

    await expect(service.getTopCoins(1)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('gooit 404 voor een onbekende coin', async () => {
    coingecko.getMarketChart.mockRejectedValue(new CoinGeckoError('market_chart', 404));

    await expect(service.getHistory('onbekend', 7)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('zet de market chart om naar prijspunten', async () => {
    coingecko.getMarketChart.mockResolvedValue({
      prices: [
        [1000, 1.5],
        [2000, 1.6],
      ],
    });

    const result = await service.getHistory('bitcoin', 7);

    expect(result.data).toEqual({
      id: 'bitcoin',
      days: 7,
      prices: [
        { timestamp: 1000, price: 1.5 },
        { timestamp: 2000, price: 1.6 },
      ],
    });
  });
  describe('getCurrentPrices', () => {
    it('geeft USD-prijzen per id en laat onbekende coins weg', async () => {
      coingecko.getSimplePrices.mockResolvedValue({ bitcoin: { usd: 65000 }, raar: {} });

      const result = await service.getCurrentPrices(['bitcoin', 'raar']);

      expect(result.data).toEqual({ bitcoin: 65000 });
    });

    it('ontdubbelt en sorteert ids zodat dezelfde set dezelfde cache-key krijgt', async () => {
      coingecko.getSimplePrices.mockResolvedValue({ bitcoin: { usd: 1 }, ethereum: { usd: 2 } });

      await service.getCurrentPrices(['ethereum', 'bitcoin', 'bitcoin']);
      await service.getCurrentPrices(['bitcoin', 'ethereum']);

      expect(coingecko.getSimplePrices).toHaveBeenCalledTimes(1);
      expect(coingecko.getSimplePrices).toHaveBeenCalledWith(['bitcoin', 'ethereum']);
    });

    it('doet geen request voor een lege lijst', async () => {
      const result = await service.getCurrentPrices([]);

      expect(result.data).toEqual({});
      expect(coingecko.getSimplePrices).not.toHaveBeenCalled();
    });
  });
});
