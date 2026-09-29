import type { DependencyCheck, HealthReport } from '@fintrack/shared-types';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoinGeckoClient } from '../coingecko/coingecko.client.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { PrismaService } from '../prisma/prisma.service.js';

const BYTES_PER_MB = 1024 * 1024;

@Injectable()
export class HealthService {
  private readonly upstreamCacheMs: number;
  private lastCoinGeckoCheck?: { result: DependencyCheck; at: number };

  constructor(
    private readonly coingecko: CoinGeckoClient,
    private readonly prisma: PrismaService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.upstreamCacheMs = config.get('HEALTH_UPSTREAM_CACHE_SECONDS', { infer: true }) * 1000;
  }

  async getReport(): Promise<HealthReport> {
    const [database, coingecko] = await Promise.all([
      timedCheck(() => this.prisma.$queryRaw`SELECT 1`),
      this.checkCoinGecko(),
    ]);
    const memory = process.memoryUsage();
    return {
      status: database.status === 'down' ? 'down' : coingecko.status === 'down' ? 'degraded' : 'ok',
      service: 'finance-service',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssMb: Math.round(memory.rss / BYTES_PER_MB),
        heapUsedMb: Math.round(memory.heapUsed / BYTES_PER_MB),
      },
      dependencies: { database, coingecko },
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
    const result = await timedCheck(() => this.coingecko.ping());
    this.lastCoinGeckoCheck = { result, at: now };
    return result;
  }
}

async function timedCheck(check: () => Promise<unknown>): Promise<DependencyCheck> {
  const started = performance.now();
  try {
    await check();
    return {
      status: 'up',
      responseTimeMs: Math.round(performance.now() - started),
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: 'down',
      responseTimeMs: Math.round(performance.now() - started),
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
