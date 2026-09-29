import { Prisma } from '../generated/prisma/client.js';
import type { PortfolioEntry as PortfolioEntryRecord } from '../generated/prisma/client.js';
import { calculatePortfolio } from './portfolio.calculator.js';

let nextId = 1;
function entry(coinId: string, amount: string, buyPriceUsd: string): PortfolioEntryRecord {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: `id-${nextId++}`,
    userId: 'user-1',
    coinId,
    amount: new Prisma.Decimal(amount),
    buyPriceUsd: new Prisma.Decimal(buyPriceUsd),
    boughtAt: now,
    note: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe('calculatePortfolio', () => {
  it('berekent waarde, winst en rendement per positie', () => {
    const { positions } = calculatePortfolio([entry('bitcoin', '0.5', '40000')], {
      bitcoin: 50000,
    });

    expect(positions[0]).toMatchObject({
      amount: 0.5,
      buyPriceUsd: 40000,
      costUsd: 20000,
      currentPriceUsd: 50000,
      valueUsd: 25000,
      pnlUsd: 5000,
      pnlPct: 25,
    });
  });

  it('geeft negatieve P&L bij verlies', () => {
    const { positions } = calculatePortfolio([entry('ethereum', '2', '3000')], {
      ethereum: 2400,
    });

    expect(positions[0]).toMatchObject({ pnlUsd: -1200, pnlPct: -20 });
  });

  it('telt totalen op over meerdere posities', () => {
    const { totals } = calculatePortfolio(
      [entry('bitcoin', '1', '30000'), entry('bitcoin', '1', '50000'), entry('solana', '10', '100')],
      { bitcoin: 45000, solana: 150 },
    );

    expect(totals).toEqual({
      costUsd: 81000,
      valueUsd: 91500,
      pnlUsd: 10500,
      pnlPct: 12.96,
      unpricedEntries: 0,
    });
  });

  it('rekent zonder float-afrondingsfouten', () => {
    const { positions } = calculatePortfolio([entry('x', '0.1', '0.2')], { x: 0.3 });

    // Met floats: 0.1 * 0.2 = 0.020000000000000004
    expect(positions[0].costUsd).toBe(0.02);
    expect(positions[0].pnlUsd).toBe(0.01);
  });

  it('laat posities zonder actuele prijs buiten de totalen', () => {
    const { positions, totals } = calculatePortfolio(
      [entry('bitcoin', '1', '30000'), entry('onbekend', '5', '10')],
      { bitcoin: 33000 },
    );

    expect(positions[1]).toMatchObject({
      costUsd: 50,
      currentPriceUsd: null,
      valueUsd: null,
      pnlUsd: null,
      pnlPct: null,
    });
    expect(totals).toMatchObject({ costUsd: 30000, valueUsd: 33000, unpricedEntries: 1 });
  });

  it('geeft pnlPct null bij kostprijs 0 (bv. gekregen coins)', () => {
    const { positions, totals } = calculatePortfolio([entry('airdrop', '100', '0')], {
      airdrop: 2,
    });

    expect(positions[0]).toMatchObject({ valueUsd: 200, pnlUsd: 200, pnlPct: null });
    expect(totals.pnlPct).toBeNull();
  });

  it('geeft nul-totalen voor een lege portfolio', () => {
    expect(calculatePortfolio([], {}).totals).toEqual({
      costUsd: 0,
      valueUsd: 0,
      pnlUsd: 0,
      pnlPct: null,
      unpricedEntries: 0,
    });
  });
});
