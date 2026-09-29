import type { CoinHistory, CoinPrice, PriceResponse } from '@fintrack/shared-types';
import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoinGeckoClient } from '../coingecko/coingecko.client.js';
import { CoinGeckoError, type CoinGeckoMarket } from '../coingecko/coingecko.types.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { MetricsService, type PriceCacheKind } from '../metrics/metrics.service.js';

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private readonly ttlMs: number;
  /**
   * Laatst geslaagde antwoord per cache-key, zonder TTL. Wordt gebruikt als CoinGecko faalt
   * (bv. rate limit), zodat de UI verouderde data kan tonen i.p.v. een fout.
   */
  private readonly lastKnownGood = new Map<string, PriceResponse<unknown>>();

  constructor(
    private readonly coingecko: CoinGeckoClient,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly metrics: MetricsService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.ttlMs = config.get('CACHE_TTL_SECONDS', { infer: true }) * 1000;
  }

  getTopCoins(limit: number): Promise<PriceResponse<CoinPrice[]>> {
    return this.cached('markets', `markets:${limit}`, async () => {
      const markets = await this.coingecko.getMarkets(limit);
      return markets.map(toCoinPrice);
    });
  }

  getHistory(id: string, days: number): Promise<PriceResponse<CoinHistory>> {
    return this.cached('history', `history:${id}:${days}`, async () => {
      const chart = await this.coingecko.getMarketChart(id, days);
      return {
        id,
        days,
        prices: chart.prices.map(([timestamp, price]) => ({ timestamp, price })),
      };
    });
  }

  /** Actuele USD-prijs per coin-id. Onbekende ids ontbreken in het resultaat. */
  async getCurrentPrices(ids: readonly string[]): Promise<PriceResponse<Record<string, number>>> {
    const uniqueIds = [...new Set(ids)].sort();
    if (uniqueIds.length === 0) {
      return { data: {}, stale: false, fetchedAt: new Date().toISOString() };
    }
    return this.cached('current', `current:${uniqueIds.join(',')}`, async () => {
      const prices = await this.coingecko.getSimplePrices(uniqueIds);
      return Object.fromEntries(
        Object.entries(prices).flatMap(([id, price]) =>
          price.usd === undefined ? [] : [[id, price.usd] as const],
        ),
      );
    });
  }

  private async cached<T>(
    kind: PriceCacheKind,
    key: string,
    fetchFresh: () => Promise<T>,
  ): Promise<PriceResponse<T>> {
    const hit = await this.cache.get<PriceResponse<T>>(key);
    if (hit) {
      this.metrics.priceCacheHits.inc({ kind });
      return hit;
    }
    this.metrics.priceCacheMisses.inc({ kind });

    try {
      const response: PriceResponse<T> = {
        data: await fetchFresh(),
        stale: false,
        fetchedAt: new Date().toISOString(),
      };
      await this.cache.set(key, response, this.ttlMs);
      this.lastKnownGood.set(key, response);
      return response;
    } catch (err) {
      if (err instanceof CoinGeckoError && err.status === 404) {
        throw new NotFoundException(`Onbekende coin voor '${key}'`);
      }
      const fallback = this.lastKnownGood.get(key) as PriceResponse<T> | undefined;
      if (fallback) {
        this.logger.warn(`CoinGecko faalde voor '${key}', verouderde data geserveerd: ${String(err)}`);
        this.metrics.priceStaleResponses.inc({ kind });
        return { ...fallback, stale: true };
      }
      this.logger.error(`CoinGecko faalde voor '${key}' en er is geen fallback: ${String(err)}`);
      throw new ServiceUnavailableException('Prijsdata is tijdelijk niet beschikbaar');
    }
  }
}

function toCoinPrice(market: CoinGeckoMarket): CoinPrice {
  return {
    id: market.id,
    symbol: market.symbol,
    name: market.name,
    image: market.image,
    currentPrice: market.current_price,
    marketCap: market.market_cap,
    priceChange24hPct: market.price_change_percentage_24h,
    lastUpdated: market.last_updated,
  };
}
