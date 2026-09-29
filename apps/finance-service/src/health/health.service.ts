import type { DependencyCheck, HealthReport } from '@fintrack/shared-types';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoinGeckoClient } from '../coingecko/coingecko.client.js';
import type { EnvironmentVariables } from '../config/env.validation.js';

const BYTES_PER_MB = 1024 * 1024;

@Injectable()
export class HealthService {
  private readonly upstreamCacheMs: number;
  private lastCoinGeckoCheck?: { result: DependencyCheck; at: number };

  constructor(
    private readonly coingecko: CoinGeckoClient,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.upstreamCacheMs = config.get('HEALTH_UPSTREAM_CACHE_SECONDS', { infer: true }) * 1000;
  }

  async getReport(): Promise<HealthReport> {
    const coingecko = await this.checkCoinGecko();
    const memory = process.memoryUsage();
    return {
      status: coingecko.status === 'up' ? 'ok' : 'degraded',
      service: 'finance-service',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssMb: Math.round(memory.rss / BYTES_PER_MB),
        heapUsedMb: Math.round(memory.heapUsed / BYTES_PER_MB),
      },
      dependencies: { coingecko },
    };
  }

  /**
   * Pingt CoinGecko, maar hergebruikt het resultaat een tijdje: de monitoring-service polt
   * /health frequent en elke ping telt mee voor de (strenge) gratis rate limit.
   */
  private async checkCoinGecko(): Promise<DependencyCheck> {
    const now = Date.now();
    if (this.lastCoinGeckoCheck && now - this.lastCoinGeckoCheck.at < this.upstreamCacheMs) {
      return this.lastCoinGeckoCheck.result;
    }

    const started = performance.now();
    let result: DependencyCheck;
    try {
      await this.coingecko.ping();
      result = {
        status: 'up',
        responseTimeMs: Math.round(performance.now() - started),
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      result = {
        status: 'down',
        responseTimeMs: Math.round(performance.now() - started),
        checkedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
    this.lastCoinGeckoCheck = { result, at: now };
    return result;
  }
}
