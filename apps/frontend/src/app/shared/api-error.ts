import { HttpErrorResponse } from '@angular/common/http';

/** Zet een fout van de finance-service om in een leesbare Nederlandse melding. */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Er ging iets mis.';
  }
  // 0 = netwerkfout; 502/504 = de dev-server-proxy bereikt de finance-service niet.
  if (error.status === 0 || error.status === 502 || error.status === 504) {
    return 'De finance-service is niet bereikbaar.';
  }
  if (error.status === 503) {
    return 'Prijsdata is tijdelijk niet beschikbaar (CoinGecko). Probeer het later opnieuw.';
  }
  // NestJS-validatiefouten: { message: string | string[] }
  const message: unknown = error.error?.message;
  if (Array.isArray(message) && message.length > 0) {
    return message.join(' · ');
  }
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }
  return `Er ging iets mis (HTTP ${error.status}).`;
}
