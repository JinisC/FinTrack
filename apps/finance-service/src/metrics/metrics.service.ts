import { MetricsRegistry } from '@fintrack/nest-observability';
import { Injectable } from '@nestjs/common';
import { Counter, Histogram } from '@prometheus-io/client';

export type PriceCacheKind = 'markets' | 'history' | 'current';

/** Finance-specifieke metrics; de HTTP- en Node-metrics komen uit @fintrack/nest-observability. */
@Injectable()
export class MetricsService {
  readonly coingeckoRequests: Counter<'endpoint' | 'status'>;
  readonly coingeckoRequestDuration: Histogram<'endpoint'>;
  readonly priceCacheHits: Counter<'kind'>;
  readonly priceCacheMisses: Counter<'kind'>;
  readonly priceStaleResponses: Counter<'kind'>;

  constructor(registry: MetricsRegistry) {
    const registers = [registry];

    this.coingeckoRequests = new Counter({
      name: 'coingecko_requests_total',
      help: 'Aantal requests naar de CoinGecko-API, per endpoint en HTTP-status',
      labelNames: ['endpoint', 'status'] as const,
      registers,
    });

    this.coingeckoRequestDuration = new Histogram({
      name: 'coingecko_request_duration_seconds',
      help: 'Duur van requests naar de CoinGecko-API',
      labelNames: ['endpoint'] as const,
      registers,
    });

    this.priceCacheHits = new Counter({
      name: 'price_cache_hits_total',
      help: 'Prijsrequests die uit de cache beantwoord werden',
      labelNames: ['kind'] as const,
      registers,
    });

    this.priceCacheMisses = new Counter({
      name: 'price_cache_misses_total',
      help: 'Prijsrequests waarvoor CoinGecko bevraagd moest worden',
      labelNames: ['kind'] as const,
      registers,
    });

    this.priceStaleResponses = new Counter({
      name: 'price_stale_responses_total',
      help: 'Antwoorden met verouderde data omdat CoinGecko niet bereikbaar was',
      labelNames: ['kind'] as const,
      registers,
    });
  }
}
