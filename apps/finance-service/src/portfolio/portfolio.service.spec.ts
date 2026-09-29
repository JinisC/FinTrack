import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { PricesService } from '../prices/prices.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { PortfolioService } from './portfolio.service.js';

const USER_ID = 'user-1';
const now = new Date('2026-01-01T00:00:00.000Z');
const record = {
  id: 'entry-1',
  userId: USER_ID,
  coinId: 'bitcoin',
  amount: new Prisma.Decimal('1'),
  buyPriceUsd: new Prisma.Decimal('30000'),
  boughtAt: now,
  note: null,
  createdAt: now,
  updatedAt: now,
};

function notFoundError() {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

describe('PortfolioService', () => {
  let prisma: {
    portfolioEntry: Record<'findMany' | 'create' | 'update' | 'delete', ReturnType<typeof vi.fn>>;
  };
  let prices: { getCurrentPrices: ReturnType<typeof vi.fn> };
  let service: PortfolioService;

  beforeEach(() => {
    prisma = {
      portfolioEntry: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    };
    prices = {
      getCurrentPrices: vi.fn().mockResolvedValue({
        data: { bitcoin: 45000 },
        stale: false,
        fetchedAt: '2026-01-01T12:00:00.000Z',
      }),
    };
    service = new PortfolioService(
      prisma as unknown as PrismaService,
      prices as unknown as PricesService,
    );
  });

  describe('getSummary', () => {
    it('combineert entries van de gebruiker met actuele prijzen', async () => {
      prisma.portfolioEntry.findMany.mockResolvedValue([record]);

      const summary = await service.getSummary(USER_ID);

      expect(prisma.portfolioEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } }),
      );
      expect(prices.getCurrentPrices).toHaveBeenCalledWith(['bitcoin']);
      expect(summary.totals.pnlUsd).toBe(15000);
      expect(summary.stale).toBe(false);
      expect(summary.pricesFetchedAt).toBe('2026-01-01T12:00:00.000Z');
    });

    it('toont de portfolio zonder waardering als CoinGecko niet beschikbaar is', async () => {
      prisma.portfolioEntry.findMany.mockResolvedValue([record]);
      prices.getCurrentPrices.mockRejectedValue(new ServiceUnavailableException());

      const summary = await service.getSummary(USER_ID);

      expect(summary.stale).toBe(true);
      expect(summary.pricesFetchedAt).toBeNull();
      expect(summary.positions[0].valueUsd).toBeNull();
      expect(summary.totals.unpricedEntries).toBe(1);
    });
  });

  describe('create', () => {
    const dto = { coinId: 'bitcoin', amount: 1, buyPriceUsd: 30000, boughtAt: now };

    it('slaat een entry op voor de gebruiker', async () => {
      prisma.portfolioEntry.create.mockResolvedValue(record);

      const created = await service.create(USER_ID, dto);

      expect(prisma.portfolioEntry.create).toHaveBeenCalledWith({
        data: { ...dto, userId: USER_ID },
      });
      expect(created).toMatchObject({ id: 'entry-1', amount: 1, buyPriceUsd: 30000 });
    });

    it('weigert een coin die CoinGecko niet kent', async () => {
      prices.getCurrentPrices.mockResolvedValue({ data: {}, stale: false, fetchedAt: '' });

      await expect(service.create(USER_ID, { ...dto, coinId: 'bitcoinn' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.portfolioEntry.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('beperkt de update tot entries van de gebruiker', async () => {
      prisma.portfolioEntry.update.mockResolvedValue({ ...record, note: 'nieuw' });

      const updated = await service.update(USER_ID, 'entry-1', { note: 'nieuw' });

      expect(prisma.portfolioEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1', userId: USER_ID },
        data: { note: 'nieuw' },
      });
      expect(updated.note).toBe('nieuw');
      expect(prices.getCurrentPrices).not.toHaveBeenCalled();
    });

    it('valideert de coin opnieuw als coinId wijzigt', async () => {
      prisma.portfolioEntry.update.mockResolvedValue(record);

      await service.update(USER_ID, 'entry-1', { coinId: 'bitcoin' });

      expect(prices.getCurrentPrices).toHaveBeenCalledWith(['bitcoin']);
    });

    it('geeft 404 als de entry niet bestaat of van iemand anders is', async () => {
      prisma.portfolioEntry.update.mockRejectedValue(notFoundError());

      await expect(service.update(USER_ID, 'entry-x', { note: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('verwijdert enkel entries van de gebruiker', async () => {
      prisma.portfolioEntry.delete.mockResolvedValue(record);

      await service.remove(USER_ID, 'entry-1');

      expect(prisma.portfolioEntry.delete).toHaveBeenCalledWith({
        where: { id: 'entry-1', userId: USER_ID },
      });
    });

    it('geeft 404 als de entry niet bestaat', async () => {
      prisma.portfolioEntry.delete.mockRejectedValue(notFoundError());

      await expect(service.remove(USER_ID, 'entry-x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
