import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import type { CoinPrice, PortfolioPosition } from '@fintrack/shared-types';
import { filter, switchMap } from 'rxjs';
import { FinanceApi } from '../core/finance-api';
import { apiErrorMessage } from '../shared/api-error';
import { ConfirmDialog, type ConfirmDialogData } from '../shared/confirm-dialog';
import { ChangePctPipe, TrendClassPipe, UsdPipe } from '../shared/format';
import { ErrorNotice, StaleNotice } from '../shared/notices';
import { EntryDialog, type EntryDialogData } from './entry-dialog';

@Component({
  selector: 'app-portfolio-page',
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTableModule,
    UsdPipe,
    ChangePctPipe,
    TrendClassPipe,
    ErrorNotice,
    StaleNotice,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-page.html',
  styleUrl: './portfolio-page.scss',
})
export class PortfolioPage {
  private readonly api = inject(FinanceApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly summary = rxResource({ stream: () => this.api.portfolio() });
  // Voor namen/logo's en de keuzelijst in het formulier; de portfolio werkt ook zonder.
  private readonly coins = rxResource({ stream: () => this.api.topCoins(50) });

  protected readonly columns = [
    'coin',
    'amount',
    'buyPrice',
    'boughtAt',
    'cost',
    'value',
    'pnl',
    'actions',
  ];

  private readonly coinsById = computed(
    () => new Map((this.coins.hasValue() ? this.coins.value().data : []).map((c) => [c.id, c])),
  );
  protected readonly errorMessage = computed(() => {
    const error = this.summary.error();
    return error ? apiErrorMessage(error) : null;
  });

  protected coin(id: string): CoinPrice | undefined {
    return this.coinsById().get(id);
  }

  protected openAdd(): void {
    this.openEntryDialog({ coins: this.coinList() }, 'Aankoop toegevoegd');
  }

  protected openEdit(position: PortfolioPosition): void {
    this.openEntryDialog({ coins: this.coinList(), entry: position }, 'Aankoop gewijzigd');
  }

  protected confirmDelete(position: PortfolioPosition): void {
    const name = this.coin(position.coinId)?.name ?? position.coinId;
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Aankoop verwijderen?',
          message: `De aankoop van ${position.amount} ${name} wordt definitief verwijderd.`,
          confirmLabel: 'Verwijderen',
        },
      })
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.api.deleteEntry(position.id)),
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Aankoop verwijderd', undefined, { duration: 3000 });
          this.summary.reload();
        },
        error: (error: unknown) => {
          this.snackBar.open(apiErrorMessage(error), 'Sluiten');
        },
      });
  }

  private openEntryDialog(data: EntryDialogData, successMessage: string): void {
    this.dialog
      .open<EntryDialog, EntryDialogData, boolean>(EntryDialog, { data, width: '520px' })
      .afterClosed()
      .pipe(filter((saved) => saved === true))
      .subscribe(() => {
        this.snackBar.open(successMessage, undefined, { duration: 3000 });
        this.summary.reload();
      });
  }

  private coinList(): CoinPrice[] | null {
    return this.coins.hasValue() ? this.coins.value().data : null;
  }
}
