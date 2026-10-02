import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { NgxEchartsDirective } from 'ngx-echarts';
import { map } from 'rxjs';
import { FinanceApi, HISTORY_DAYS, type HistoryDays } from '../core/finance-api';
import { apiErrorMessage } from '../shared/api-error';
import { ChangePctPipe, TrendClassPipe, UsdPipe } from '../shared/format';
import { ErrorNotice, StaleNotice } from '../shared/notices';
import { periodChangePct, priceChartOptions } from './price-chart';

const DAY_LABELS: Record<HistoryDays, string> = {
  1: '24u',
  7: '7d',
  30: '30d',
  90: '90d',
  365: '1j',
};

@Component({
  selector: 'app-coin-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    NgxEchartsDirective,
    UsdPipe,
    ChangePctPipe,
    TrendClassPipe,
    ErrorNotice,
    StaleNotice,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coin-detail-page.html',
  styleUrl: './coin-detail-page.scss',
})
export class CoinDetailPage {
  private readonly api = inject(FinanceApi);

  /** Route-parameter `:id` (via withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly dayOptions = HISTORY_DAYS.map((days) => ({ days, label: DAY_LABELS[days] }));
  protected readonly days = signal<HistoryDays>(7);

  protected readonly history = rxResource({
    params: () => ({ id: this.id(), days: this.days() }),
    stream: ({ params }) => this.api.history(params.id, params.days),
  });

  // Naam, logo en actuele prijs komen uit de (gecachete) toplijst.
  private readonly coins = rxResource({ stream: () => this.api.topCoins(50) });
  protected readonly coin = computed(() =>
    this.coins.hasValue() ? this.coins.value().data.find((c) => c.id === this.id()) : undefined,
  );

  private readonly dark = toSignal(
    inject(BreakpointObserver)
      .observe('(prefers-color-scheme: dark)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly points = computed(() =>
    this.history.hasValue() ? this.history.value().data.prices : [],
  );
  protected readonly chartOptions = computed(() => priceChartOptions(this.points(), this.dark()));
  protected readonly changePct = computed(() => periodChangePct(this.points()));
  protected readonly errorMessage = computed(() => {
    const error = this.history.error();
    return error ? apiErrorMessage(error) : null;
  });
}
