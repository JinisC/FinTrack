import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import type { CoinPrice, PortfolioEntry } from '@fintrack/shared-types';
import { of, throwError } from 'rxjs';
import { FinanceApi } from '../core/finance-api';
import { EntryDialog, type EntryDialogData } from './entry-dialog';

const bitcoin = { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', currentPrice: 65000 } as CoinPrice;

const existing: PortfolioEntry = {
  id: 'e1',
  coinId: 'bitcoin',
  amount: 1,
  buyPriceUsd: 50000,
  boughtAt: '2026-03-15T10:30:00.000Z',
  note: 'oud',
  createdAt: '2026-03-15T10:30:00.000Z',
  updatedAt: '2026-03-15T10:30:00.000Z',
};

function setup(data: EntryDialogData) {
  const api = {
    createEntry: vi.fn(() => of(existing)),
    updateEntry: vi.fn(() => of(existing)),
  };
  const dialogRef = { close: vi.fn() };
  TestBed.configureTestingModule({
    imports: [EntryDialog],
    providers: [
      { provide: FinanceApi, useValue: api },
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: MAT_DIALOG_DATA, useValue: data },
    ],
  });
  const fixture = TestBed.createComponent(EntryDialog);
  // `form` en `submit` zijn protected; voor de test benaderen we ze rechtstreeks.
  const dialog = fixture.componentInstance as unknown as { form: FormGroup; submit(): void };
  return { fixture, dialog, api, dialogRef };
}

describe('EntryDialog', () => {
  it('weigert een ongeldig formulier zonder request', () => {
    const { dialog, api } = setup({ coins: [bitcoin] });
    dialog.form.patchValue({ coinId: 'bitcoin', amount: 0, buyPriceUsd: 100 });

    dialog.submit();

    expect(dialog.form.get('amount')?.hasError('positive')).toBe(true);
    expect(api.createEntry).not.toHaveBeenCalled();
  });

  it('vult de actuele prijs in bij het kiezen van een coin', () => {
    const { dialog } = setup({ coins: [bitcoin] });
    dialog.form.get('coinId')?.setValue('bitcoin');
    expect(dialog.form.get('buyPriceUsd')?.value).toBe(65000);
  });

  it('maakt een nieuwe aankoop aan en sluit het venster', () => {
    const { dialog, api, dialogRef } = setup({ coins: [bitcoin] });
    dialog.form.patchValue({
      coinId: 'bitcoin',
      amount: 0.5,
      buyPriceUsd: 60000,
      boughtAt: '2026-09-01',
    });

    dialog.submit();

    expect(api.createEntry).toHaveBeenCalledWith({
      coinId: 'bitcoin',
      amount: 0.5,
      buyPriceUsd: 60000,
      boughtAt: new Date('2026-09-01T00:00:00').toISOString(),
    });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('behoudt het oorspronkelijke tijdstip als de datum niet wijzigt', () => {
    const { dialog, api } = setup({ coins: [bitcoin], entry: existing });
    dialog.form.patchValue({ amount: 2, note: '' });

    dialog.submit();

    expect(api.updateEntry).toHaveBeenCalledWith('e1', {
      coinId: 'bitcoin',
      amount: 2,
      buyPriceUsd: 50000,
      boughtAt: existing.boughtAt,
      note: '',
    });
  });

  it('toont de foutmelding van de server en blijft open', async () => {
    const { fixture, dialog, api, dialogRef } = setup({ coins: [bitcoin] });
    api.createEntry.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { message: ['coinId is ongeldig'] } }),
      ),
    );
    dialog.form.patchValue({ coinId: 'bitcoin', amount: 1, buyPriceUsd: 1 });

    dialog.submit();
    await fixture.whenStable();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'coinId is ongeldig',
    );
  });
});
