import type {
  PortfolioEntry,
  PortfolioPosition,
  PortfolioTotals,
} from '@fintrack/shared-types';
import { Prisma } from '../generated/prisma/client.js';
import type { PortfolioEntry as PortfolioEntryRecord } from '../generated/prisma/client.js';

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export function toPortfolioEntry(record: PortfolioEntryRecord): PortfolioEntry {
  return {
    id: record.id,
    coinId: record.coinId,
    amount: record.amount.toNumber(),
    buyPriceUsd: record.buyPriceUsd.toNumber(),
    boughtAt: record.boughtAt.toISOString(),
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Berekent waarde en winst/verlies per entry en in totaal. Rekent met Decimal i.p.v. floats,
 * zodat bv. 0.1 + 0.2 geen afrondingsfouten geeft; pas het resultaat wordt een number.
 */
export function calculatePortfolio(
  records: readonly PortfolioEntryRecord[],
  pricesUsd: Readonly<Record<string, number>>,
): { positions: PortfolioPosition[]; totals: PortfolioTotals } {
  let totalCost = new Decimal(0);
  let totalValue = new Decimal(0);
  let unpricedEntries = 0;

  const positions = records.map((record): PortfolioPosition => {
    const cost = record.amount.times(record.buyPriceUsd);
    const price = pricesUsd[record.coinId];

    if (price === undefined) {
      unpricedEntries++;
      return {
        ...toPortfolioEntry(record),
        costUsd: cost.toNumber(),
        currentPriceUsd: null,
        valueUsd: null,
        pnlUsd: null,
        pnlPct: null,
      };
    }

    const value = record.amount.times(price);
    const pnl = value.minus(cost);
    totalCost = totalCost.plus(cost);
    totalValue = totalValue.plus(value);
    return {
      ...toPortfolioEntry(record),
      costUsd: cost.toNumber(),
      currentPriceUsd: price,
      valueUsd: value.toNumber(),
      pnlUsd: pnl.toNumber(),
      pnlPct: percentage(pnl, cost),
    };
  });

  const totalPnl = totalValue.minus(totalCost);
  return {
    positions,
    totals: {
      costUsd: totalCost.toNumber(),
      valueUsd: totalValue.toNumber(),
      pnlUsd: totalPnl.toNumber(),
      pnlPct: percentage(totalPnl, totalCost),
      unpricedEntries,
    },
  };
}

/** Rendement in procent (2 decimalen), of null als de kostprijs 0 is (bv. gekregen coins). */
function percentage(pnl: Decimal, cost: Decimal): number | null {
  return cost.isZero() ? null : pnl.dividedBy(cost).times(100).toDecimalPlaces(2).toNumber();
}
