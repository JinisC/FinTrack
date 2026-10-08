import { TestBed } from '@angular/core/testing';
import type { PortfolioSummary } from '@fintrack/shared-types';
import { of } from 'rxjs';
import { FinanceApi } from '../core/finance-api';
import { PortfolioPage } from './portfolio-page';

const emptySummary: PortfolioSummary = {
  positions: [],
  totals: { costUsd: 0, valueUsd: 0, pnlUsd: 0, pnlPct: null, unpricedEntries: 0 },
  stale: false,
  pricesFetchedAt: null,
};

const summaryWithPosition: PortfolioSummary = {
  positions: [
    {
      id: '1',
      coinId: 'bitcoin',
      amount: 0.5,
      buyPriceUsd: 60000,
      boughtAt: '2026-09-01T00:00:00.000Z',
      note: 'Eerste aankoop',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      costUsd: 30000,
      currentPriceUsd: 65000,
      valueUsd: 32500,
      pnlUsd: 2500,
      pnlPct: 8.333,
    },
  ],
  totals: { costUsd: 30000, valueUsd: 32500, pnlUsd: 2500, pnlPct: 8.333, unpricedEntries: 0 },
  stale: false,
  pricesFetchedAt: '2026-10-01T10:00:00.000Z',
};

async function render(summary: PortfolioSummary) {
  const api: Partial<FinanceApi> = {
    portfolio: () => of(summary),
    topCoins: () => of({ data: [], stale: false, fetchedAt: '2026-10-01T10:00:00.000Z' }),
  };
  TestBed.configureTestingModule({
    imports: [PortfolioPage],
    providers: [{ provide: FinanceApi, useValue: api }],
  });
  const fixture = TestBed.createComponent(PortfolioPage);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('PortfolioPage', () => {
  it('toont een lege toestand zonder aankopen', async () => {
    const el = await render(emptySummary);
    expect(el.querySelector('.empty')?.textContent).toContain('nog leeg');
    expect(el.querySelector('table')).toBeNull();
  });

  it('toont totalen en posities met winst in het groen', async () => {
    const el = await render(summaryWithPosition);

    const totals = el.querySelector('.totals')?.textContent?.replace(/\s/g, ' ');
    expect(totals).toContain('$ 30.000,00');
    expect(totals).toContain('$ 32.500,00');

    const row = el.querySelector('tr[mat-row]');
    expect(row?.textContent).toContain('bitcoin');
    expect(row?.textContent).toContain('Eerste aankoop');
    expect(row?.querySelector('.positive')?.textContent).toContain('+8,33%');
  });
});
