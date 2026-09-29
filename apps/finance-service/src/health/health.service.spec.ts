import { ConfigService } from '@nestjs/config';
import type { CoinGeckoClient } from '../coingecko/coingecko.client.js';
import { CoinGeckoError } from '../coingecko/coingecko.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  let coingecko: { ping: ReturnType<typeof vi.fn> };
  let prisma: { $queryRaw: ReturnType<typeof vi.fn> };

  const createService = (cacheSeconds: number) =>
    new HealthService(
      coingecko as unknown as CoinGeckoClient,
      prisma as unknown as PrismaService,
      new ConfigService({ HEALTH_UPSTREAM_CACHE_SECONDS: cacheSeconds }),
    );

  beforeEach(() => {
    coingecko = { ping: vi.fn().mockResolvedValue(undefined) };
    prisma = { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
  });

  it('meldt ok als database en CoinGecko bereikbaar zijn', async () => {
    const report = await createService(30).getReport();

    expect(report.status).toBe('ok');
    expect(report.service).toBe('finance-service');
    expect(report.dependencies.database.status).toBe('up');
    expect(report.dependencies.coingecko.status).toBe('up');
  });

  it('meldt degraded (niet down) als CoinGecko faalt', async () => {
    coingecko.ping.mockRejectedValue(new CoinGeckoError('ping', 503));

    const report = await createService(30).getReport();

    expect(report.status).toBe('degraded');
    expect(report.dependencies.coingecko.status).toBe('down');
    expect(report.dependencies.coingecko.error).toContain('503');
  });

  it('meldt down als de database faalt, ook als CoinGecko werkt', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Connection terminated unexpectedly'));

    const report = await createService(30).getReport();

    expect(report.status).toBe('down');
    expect(report.dependencies.database).toMatchObject({
      status: 'down',
      error: 'Connection terminated unexpectedly',
    });
  });

  it('hergebruikt het CoinGecko-resultaat binnen de cacheperiode, maar checkt de database altijd', async () => {
    const service = createService(30);

    await service.getReport();
    await service.getReport();

    expect(coingecko.ping).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('pingt CoinGecko elke keer als de cache uitgeschakeld is', async () => {
    const service = createService(0);

    await service.getReport();
    await service.getReport();

    expect(coingecko.ping).toHaveBeenCalledTimes(2);
  });
});
