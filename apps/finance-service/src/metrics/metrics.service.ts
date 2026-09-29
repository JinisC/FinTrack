import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from '@prometheus-io/client';

export type PriceCacheKind = 'markets' | 'history';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duur van inkomende HTTP-requests',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });

  readonly coingeckoRequests = new Counter({
    name: 'coingecko_requests_total',
    help: 'Aantal requests naar de CoinGecko-API, per endpoint en HTTP-status',
    labelNames: ['endpoint', 'status'] as const,
    registers: [this.registry],
  });

  readonly coingeckoRequestDuration = new Histogram({
    name: 'coingecko_request_duration_seconds',
    help: 'Duur van requests naar de CoinGecko-API',
    labelNames: ['endpoint'] as const,
    registers: [this.registry],
  });

  readonly priceCacheHits = new Counter({
    name: 'price_cache_hits_total',
    help: 'Prijsrequests die uit de cache beantwoord werden',
    labelNames: ['kind'] as const,
    registers: [this.registry],
  });

  readonly priceCacheMisses = new Counter({
    name: 'price_cache_misses_total',
    help: 'Prijsrequests waarvoor CoinGecko bevraagd moest worden',
    labelNames: ['kind'] as const,
    registers: [this.registry],
  });

  readonly priceStaleResponses = new Counter({
    name: 'price_stale_responses_total',
    help: 'Antwoorden met verouderde data omdat CoinGecko niet bereikbaar was',
    labelNames: ['kind'] as const,
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }
}
