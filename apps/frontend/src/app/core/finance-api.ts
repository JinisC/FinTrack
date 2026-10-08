import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CoinHistory,
  CoinPrice,
  CreatePortfolioEntryRequest,
  PortfolioEntry,
  PortfolioSummary,
  PriceResponse,
  UpdatePortfolioEntryRequest,
} from '@fintrack/shared-types';
import type { Observable } from 'rxjs';

/** Periodes die de finance-service ondersteunt voor de prijshistoriek. */
export const HISTORY_DAYS = [1, 7, 30, 90, 365] as const;
export type HistoryDays = (typeof HISTORY_DAYS)[number];

/** REST-client voor de finance-service (in development via de proxy op `/api`). */
@Injectable({ providedIn: 'root' })
export class FinanceApi {
  private readonly http = inject(HttpClient);

  topCoins(limit = 20): Observable<PriceResponse<CoinPrice[]>> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<PriceResponse<CoinPrice[]>>('/api/prices', { params });
  }

  history(coinId: string, days: HistoryDays): Observable<PriceResponse<CoinHistory>> {
    const params = new HttpParams().set('days', days);
    return this.http.get<PriceResponse<CoinHistory>>(
      `/api/prices/${encodeURIComponent(coinId)}/history`,
      { params },
    );
  }

  portfolio(): Observable<PortfolioSummary> {
    return this.http.get<PortfolioSummary>('/api/portfolio');
  }

  createEntry(body: CreatePortfolioEntryRequest): Observable<PortfolioEntry> {
    return this.http.post<PortfolioEntry>('/api/portfolio/entries', body);
  }

  updateEntry(id: string, body: UpdatePortfolioEntryRequest): Observable<PortfolioEntry> {
    return this.http.patch<PortfolioEntry>(`/api/portfolio/entries/${id}`, body);
  }

  deleteEntry(id: string): Observable<void> {
    return this.http.delete<void>(`/api/portfolio/entries/${id}`);
  }
}
