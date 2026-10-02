import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { FinanceApi } from '../core/finance-api';
import { apiErrorMessage } from '../shared/api-error';
import { ChangePctPipe, CompactUsdPipe, TrendClassPipe, UsdPipe } from '../shared/format';
import { ErrorNotice, StaleNotice } from '../shared/notices';

@Component({
  selector: 'app-prices-page',
  imports: [
    RouterLink,
    MatCardModule,
    MatProgressBarModule,
    MatTableModule,
    UsdPipe,
    CompactUsdPipe,
    ChangePctPipe,
    TrendClassPipe,
    ErrorNotice,
    StaleNotice,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prices-page.html',
  styleUrl: './prices-page.scss',
})
export class PricesPage {
  private readonly api = inject(FinanceApi);

  protected readonly coins = rxResource({ stream: () => this.api.topCoins(20) });
  protected readonly columns = ['rank', 'name', 'price', 'change', 'marketCap'];
  protected readonly errorMessage = computed(() => {
    const error = this.coins.error();
    return error ? apiErrorMessage(error) : null;
  });
}
