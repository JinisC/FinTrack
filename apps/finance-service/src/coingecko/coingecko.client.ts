import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { MetricsService } from '../metrics/metrics.service.js';
import {
  CoinGeckoError,
  type CoinGeckoMarket,
  type CoinGeckoMarketChart,
  type CoinGeckoSimplePrices,
} from './coingecko.types.js';

const VS_CURRENCY = 'usd';

@Injectable()
export class CoinGeckoClient {
  constructor(
    private readonly http: HttpService,
    private readonly metrics: MetricsService,
  ) {}

  getMarkets(limit: number): Promise<CoinGeckoMarket[]> {
    return this.request('markets', '/coins/markets', {
      vs_currency: VS_CURRENCY,
      order: 'market_cap_desc',
      per_page: limit,
      page: 1,
    });
  }

  getMarketChart(id: string, days: number): Promise<CoinGeckoMarketChart> {
    return this.request('market_chart', `/coins/${encodeURIComponent(id)}/market_chart`, {
      vs_currency: VS_CURRENCY,
      days,
    });
  }

  getSimplePrices(ids: readonly string[]): Promise<CoinGeckoSimplePrices> {
    return this.request('simple_price', '/simple/price', {
      ids: ids.join(','),
      vs_currencies: VS_CURRENCY,
    });
  }

  async ping(): Promise<void> {
    await this.request('ping', '/ping');
  }

  private async request<T>(
    endpoint: string,
    path: string,
    params?: Record<string, string | number>,
  ): Promise<T> {
    const endTimer = this.metrics.coingeckoRequestDuration.startTimer({ endpoint });
    try {
      const response = await firstValueFrom(this.http.get<T>(path, { params }));
      this.metrics.coingeckoRequests.inc({ endpoint, status: String(response.status) });
      return response.data;
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      this.metrics.coingeckoRequests.inc({
        endpoint,
        status: status ? String(status) : 'network_error',
      });
      throw new CoinGeckoError(endpoint, status, { cause: err });
    } finally {
      endTimer();
    }
  }
}
