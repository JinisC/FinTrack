import { ConfigService } from '@nestjs/config';
import type { CoinGeckoClient } from '../coingecko/coingecko.client.js';
import { CoinGeckoError } from '../coingecko/coingecko.types.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  let coingecko: { ping: ReturnType<typeof vi.fn> };

  const createService = (cacheSeconds: number) =>
    new HealthService(
      coingecko as unknown as CoinGeckoClient,
      new ConfigService({ HEALTH_UPSTREAM_CACHE_SECONDS: cacheSeconds }),
    );

  beforeEach(() => {
    coingecko = { ping: vi.fn() };
  });

  it('meldt ok als CoinGecko bereikbaar is', async () => {
    coingecko.ping.mockResolvedValue(undefined);

    const report = await createService(30).getReport();

    expect(report.status).toBe('ok');
    expect(report.service).toBe('finance-service');
    expect(report.dependencies.coingecko.status).toBe('up');
  });

  it('meldt degraded (niet down) als CoinGecko faalt', async () => {
    coingecko.ping.mockRejectedValue(new CoinGeckoError('ping', 503));

    const report = await createService(30).getReport();

    expect(report.status).toBe('degraded');
    expect(report.dependencies.coingecko.status).toBe('down');
    expect(report.dependencies.coingecko.error).toContain('503');
  });

  it('hergebruikt het ping-resultaat binnen de cacheperiode', async () => {
    coingecko.ping.mockResolvedValue(undefined);
    const service = createService(30);

    await service.getReport();
    await service.getReport();

    expect(coingecko.ping).toHaveBeenCalledTimes(1);
  });

  it('pingt elke keer als de cache uitgeschakeld is', async () => {
    coingecko.ping.mockResolvedValue(undefined);
    const service = createService(0);

    await service.getReport();
    await service.getReport();

    expect(coingecko.ping).toHaveBeenCalledTimes(2);
  });
});
