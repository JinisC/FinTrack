import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CoinPrice, PriceResponse } from '@fintrack/shared-types';
import { of, throwError } from 'rxjs';
import { FinanceApi } from '../core/finance-api';
import { PricesPage } from './prices-page';

const bitcoin: CoinPrice = {
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  image: 'https://example.com/btc.png',
  currentPrice: 65000,
  marketCap: 1_300_000_000_000,
  priceChange24hPct: -2.5,
  lastUpdated: '2026-10-01T10:00:00.000Z',
};

const response = (stale = false): PriceResponse<CoinPrice[]> => ({
  data: [bitcoin],
  stale,
  fetchedAt: '2026-10-01T10:00:00.000Z',
});

async function render(topCoins: FinanceApi['topCoins']) {
  TestBed.configureTestingModule({
    imports: [PricesPage],
    providers: [provideRouter([]), { provide: FinanceApi, useValue: { topCoins } }],
  });
  const fixture = TestBed.createComponent(PricesPage);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('PricesPage', () => {
  it('toont een rij per coin met link naar de detailpagina', async () => {
    const el = await render(() => of(response()));

    const rows = el.querySelectorAll('tr[mat-row]');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Bitcoin');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/prices/bitcoin');
    expect(rows[0].querySelector('.negative')?.textContent).toContain('-2,50%');
    expect(el.querySelector('app-stale-notice')).toBeNull();
  });

  it('waarschuwt als de prijzen uit de cache komen', async () => {
    const el = await render(() => of(response(true)));
    expect(el.querySelector('app-stale-notice')).not.toBeNull();
  });

  it('toont een foutmelding als de service faalt', async () => {
    const el = await render(() => throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(el.querySelector('app-error-notice')?.textContent).toContain('niet bereikbaar');
    expect(el.querySelector('table')).toBeNull();
  });
});
