import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { CoinPrice, CreatePortfolioEntryRequest, PortfolioEntry } from '@fintrack/shared-types';
import { FinanceApi } from '../core/finance-api';
import { apiErrorMessage } from '../shared/api-error';
import { UsdPipe } from '../shared/format';

export interface EntryDialogData {
  /** Coins voor de keuzelijst; `null` als de prijzen niet geladen konden worden. */
  coins: CoinPrice[] | null;
  /** Bestaande aankoop om te wijzigen; leeg = nieuwe aankoop. */
  entry?: PortfolioEntry;
}

const COIN_ID_PATTERN = /^[a-z0-9-]+$/;

function positive(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  return value === null || value > 0 ? null : { positive: true };
}

/** Een datum (yyyy-MM-dd) mag niet in de toekomst liggen. */
function notInFuture(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && control.value > today() ? { future: true } : null;
}

function today(): string {
  return toDateInput(new Date());
}

/** Lokale kalenderdag in het formaat van `<input type="date">` (yyyy-MM-dd). */
function toDateInput(date: Date | string): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Dialoog om een aankoop toe te voegen of te wijzigen; sluit met `true` na opslaan. */
@Component({
  selector: 'app-entry-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    UsdPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entry-dialog.html',
  styleUrl: './entry-dialog.scss',
})
export class EntryDialog {
  private readonly api = inject(FinanceApi);
  private readonly dialogRef = inject<MatDialogRef<EntryDialog, boolean>>(MatDialogRef);
  protected readonly data = inject<EntryDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data.entry;
  protected readonly maxDate = today();
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  /** Keuzelijst, aangevuld met de coin van de bestaande aankoop als die niet in de toplijst staat. */
  protected readonly coinOptions = this.buildCoinOptions();

  protected readonly form = new FormGroup({
    coinId: new FormControl(this.data.entry?.coinId ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(COIN_ID_PATTERN)],
    }),
    amount: new FormControl<number | null>(this.data.entry?.amount ?? null, [
      Validators.required,
      positive,
    ]),
    buyPriceUsd: new FormControl<number | null>(this.data.entry?.buyPriceUsd ?? null, [
      Validators.required,
      Validators.min(0),
    ]),
    boughtAt: new FormControl(
      this.data.entry ? toDateInput(this.data.entry.boughtAt) : today(),
      { nonNullable: true, validators: [Validators.required, notInFuture] },
    ),
    note: new FormControl(this.data.entry?.note ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  constructor() {
    // Bij een nieuwe aankoop vult de actuele prijs de aankoopprijs alvast in.
    if (!this.isEdit) {
      this.form.controls.coinId.valueChanges.pipe(takeUntilDestroyed()).subscribe((coinId) => {
        const coin = this.data.coins?.find((c) => c.id === coinId);
        if (coin && this.form.controls.buyPriceUsd.pristine) {
          this.form.controls.buyPriceUsd.setValue(coin.currentPrice);
        }
      });
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const body = this.toRequest();
    const request = this.data.entry
      ? this.api.updateEntry(this.data.entry.id, body)
      : this.api.createEntry(body);

    this.saving.set(true);
    this.serverError.set(null);
    request.subscribe({
      next: () => this.dialogRef.close(true),
      error: (error: unknown) => {
        this.saving.set(false);
        this.serverError.set(apiErrorMessage(error));
      },
    });
  }

  private toRequest(): CreatePortfolioEntryRequest {
    const { coinId, amount, buyPriceUsd, boughtAt, note } = this.form.getRawValue();
    const trimmedNote = note.trim();
    return {
      coinId,
      amount: amount ?? 0,
      buyPriceUsd: buyPriceUsd ?? 0,
      boughtAt: this.toBoughtAt(boughtAt),
      // Bij wijzigen mag een notitie ook leeggemaakt worden.
      ...(trimmedNote || this.isEdit ? { note: trimmedNote } : {}),
    };
  }

  /**
   * Zet de gekozen dag om naar een tijdstip. Een ongewijzigde datum behoudt het oorspronkelijke
   * tijdstip, "vandaag" wordt nu (de backend weigert tijdstippen in de toekomst).
   */
  private toBoughtAt(date: string): string {
    const original = this.data.entry?.boughtAt;
    if (original && toDateInput(original) === date) return original;
    if (date === today()) return new Date().toISOString();
    return new Date(`${date}T00:00:00`).toISOString();
  }

  private buildCoinOptions(): { id: string; label: string }[] | null {
    const coins = this.data.coins;
    if (!coins) return null;
    const options = coins.map((c) => ({ id: c.id, label: `${c.name} (${c.symbol.toUpperCase()})` }));
    const current = this.data.entry?.coinId;
    if (current && !options.some((o) => o.id === current)) {
      options.unshift({ id: current, label: current });
    }
    return options;
  }

  protected currentPrice(coinId: string): number | null {
    return this.data.coins?.find((c) => c.id === coinId)?.currentPrice ?? null;
  }
}
