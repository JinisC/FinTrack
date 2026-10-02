import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

const noticeStyles = `
  :host {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    margin-bottom: 16px;
    border-radius: var(--mat-sys-corner-medium);
  }
  .text {
    flex: 1;
  }
`;

/** Melding dat getoonde data uit de cache komt omdat CoinGecko niet antwoordde. */
@Component({
  selector: 'app-stale-notice',
  imports: [DatePipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  template: `
    <mat-icon>history</mat-icon>
    <span class="text">
      {{ message() }}
      @if (fetchedAt(); as at) {
        Laatst bijgewerkt om {{ at | date: 'HH:mm:ss' }}.
      }
    </span>
  `,
  styles: [
    noticeStyles,
    `:host {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }`,
  ],
})
export class StaleNotice {
  readonly fetchedAt = input<string | null>(null);
  readonly message = input('CoinGecko is even niet bereikbaar: je ziet de laatst bekende prijzen.');
}

/** Foutmelding met een knop om opnieuw te proberen. */
@Component({
  selector: 'app-error-notice',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'alert' },
  template: `
    <mat-icon>error</mat-icon>
    <span class="text">{{ message() }}</span>
    <button mat-button (click)="retry.emit()">Opnieuw proberen</button>
  `,
  styles: [
    noticeStyles,
    `:host {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }`,
  ],
})
export class ErrorNotice {
  readonly message = input.required<string>();
  readonly retry = output();
}
