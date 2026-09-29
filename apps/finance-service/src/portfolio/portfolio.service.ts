import type { PortfolioEntry, PortfolioSummary } from '@fintrack/shared-types';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PricesService } from '../prices/prices.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreatePortfolioEntryDto,
  UpdatePortfolioEntryDto,
} from './dto/portfolio-entry.dto.js';
import { calculatePortfolio, toPortfolioEntry } from './portfolio.calculator.js';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly prices: PricesService,
  ) {}

  async getSummary(userId: string): Promise<PortfolioSummary> {
    const records = await this.prisma.portfolioEntry.findMany({
      where: { userId },
      orderBy: [{ boughtAt: 'asc' }, { createdAt: 'asc' }],
    });

    // Zonder prijzen tonen we de portfolio nog steeds (zonder waarde/P&L) i.p.v. een fout.
    let prices: Record<string, number> = {};
    let stale = false;
    let pricesFetchedAt: string | null = null;
    try {
      const current = await this.prices.getCurrentPrices(records.map((r) => r.coinId));
      prices = current.data;
      stale = current.stale;
      pricesFetchedAt = current.fetchedAt;
    } catch (err) {
      if (!(err instanceof ServiceUnavailableException)) throw err;
      this.logger.warn('Geen actuele prijzen beschikbaar; portfolio zonder waardering getoond');
      stale = true;
    }

    return { ...calculatePortfolio(records, prices), stale, pricesFetchedAt };
  }

  async create(userId: string, dto: CreatePortfolioEntryDto): Promise<PortfolioEntry> {
    await this.assertKnownCoin(dto.coinId);
    const record = await this.prisma.portfolioEntry.create({
      data: {
        userId,
        coinId: dto.coinId,
        amount: dto.amount,
        buyPriceUsd: dto.buyPriceUsd,
        boughtAt: dto.boughtAt,
        note: dto.note,
      },
    });
    return toPortfolioEntry(record);
  }

  async update(userId: string, id: string, dto: UpdatePortfolioEntryDto): Promise<PortfolioEntry> {
    if (dto.coinId !== undefined) {
      await this.assertKnownCoin(dto.coinId);
    }
    const record = await this.notFoundOnMissing(id, () =>
      this.prisma.portfolioEntry.update({ where: { id, userId }, data: dto }),
    );
    return toPortfolioEntry(record);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.notFoundOnMissing(id, () =>
      this.prisma.portfolioEntry.delete({ where: { id, userId } }),
    );
  }

  /** Voorkomt entries voor tikfouten als "bitcoinn": CoinGecko moet de coin kennen. */
  private async assertKnownCoin(coinId: string): Promise<void> {
    const { data } = await this.prices.getCurrentPrices([coinId]);
    if (data[coinId] === undefined) {
      throw new BadRequestException(`Onbekende coin '${coinId}'`);
    }
  }

  /** Entries van een andere gebruiker gedragen zich als niet-bestaand (geen informatielek). */
  private async notFoundOnMissing<T>(id: string, operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException(`Portfolio-entry '${id}' niet gevonden`);
      }
      throw err;
    }
  }
}
