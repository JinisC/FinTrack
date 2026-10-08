import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FinanceApi } from './finance-api';

describe('FinanceApi', () => {
  let api: FinanceApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FinanceApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('vraagt de toplijst op met een limiet', () => {
    api.topCoins(50).subscribe();
    const req = http.expectOne('/api/prices?limit=50');
    expect(req.request.method).toBe('GET');
  });

  it('vraagt de prijshistoriek op per coin en periode', () => {
    api.history('usd-coin', 30).subscribe();
    http.expectOne('/api/prices/usd-coin/history?days=30');
  });

  it('haalt de portfolio op', () => {
    api.portfolio().subscribe();
    http.expectOne('/api/portfolio');
  });

  it('maakt, wijzigt en verwijdert aankopen', () => {
    const body = { coinId: 'bitcoin', amount: 1, buyPriceUsd: 100, boughtAt: '2026-01-01' };

    api.createEntry(body).subscribe();
    const create = http.expectOne('/api/portfolio/entries');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(body);

    api.updateEntry('abc', { amount: 2 }).subscribe();
    const update = http.expectOne('/api/portfolio/entries/abc');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ amount: 2 });

    api.deleteEntry('abc').subscribe();
    expect(http.expectOne('/api/portfolio/entries/abc').request.method).toBe('DELETE');
  });
});
