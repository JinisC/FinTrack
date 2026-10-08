import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/** Plaatshouder tot het monitoring-dashboard gebouwd is (stap 7). */
@Component({
  selector: 'app-monitoring-page',
  imports: [MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header"><h1>Monitoring</h1></header>
    <mat-card appearance="outlined" class="placeholder">
      <mat-icon>construction</mat-icon>
      <p>
        Het monitoring-dashboard (uptime, responstijden en incidenten van de finance-service) komt
        in een volgende stap.
      </p>
    </mat-card>
  `,
  styles: `
    .placeholder {
      align-items: center;
      gap: 8px;
      padding: 40px 16px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class MonitoringPage {}
