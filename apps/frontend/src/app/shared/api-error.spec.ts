import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error';

const httpError = (status: number, error: unknown = null) =>
  new HttpErrorResponse({ status, error });

describe('apiErrorMessage', () => {
  it('meldt dat de service onbereikbaar is bij een netwerkfout', () => {
    expect(apiErrorMessage(httpError(0))).toBe('De finance-service is niet bereikbaar.');
  });

  it('meldt dat de service onbereikbaar is als de proxy hem niet bereikt', () => {
    expect(apiErrorMessage(httpError(502))).toBe('De finance-service is niet bereikbaar.');
    expect(apiErrorMessage(httpError(504))).toBe('De finance-service is niet bereikbaar.');
  });

  it('legt een 503 uit als CoinGecko-storing', () => {
    expect(apiErrorMessage(httpError(503))).toContain('CoinGecko');
  });

  it('voegt NestJS-validatiefouten samen', () => {
    const error = httpError(400, { message: ['amount must be positive', 'coinId is ongeldig'] });
    expect(apiErrorMessage(error)).toBe('amount must be positive · coinId is ongeldig');
  });

  it('gebruikt een losse foutboodschap van de server', () => {
    expect(apiErrorMessage(httpError(404, { message: 'Entry niet gevonden' }))).toBe(
      'Entry niet gevonden',
    );
  });

  it('valt terug op de statuscode', () => {
    expect(apiErrorMessage(httpError(500))).toBe('Er ging iets mis (HTTP 500).');
  });

  it('behandelt andere fouten generiek', () => {
    expect(apiErrorMessage(new Error('boem'))).toBe('Er ging iets mis.');
  });
});
