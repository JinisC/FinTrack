import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavLink {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar class="toolbar">
      <a class="brand" routerLink="/">
        <mat-icon>monitoring</mat-icon>
        <span>FinTrack</span>
      </a>
      <nav class="nav" aria-label="Hoofdnavigatie">
        @for (link of links; track link.path) {
          <a
            mat-button
            [routerLink]="link.path"
            routerLinkActive="active"
            ariaCurrentWhenActive="page"
          >
            <mat-icon>{{ link.icon }}</mat-icon>
            <span class="label">{{ link.label }}</span>
          </a>
        }
      </nav>
    </mat-toolbar>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      gap: 16px;
      background: var(--mat-sys-surface-container);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      color: inherit;
      text-decoration: none;
      font: var(--mat-sys-title-large);
    }
    .nav {
      display: flex;
      gap: 4px;
      margin-left: auto;
    }
    .nav a.active {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    @media (max-width: 600px) {
      .brand span,
      .nav .label {
        display: none;
      }
    }
  `,
})
export class App {
  protected readonly links: NavLink[] = [
    { path: '/prices', label: 'Markt', icon: 'show_chart' },
    { path: '/portfolio', label: 'Portfolio', icon: 'account_balance_wallet' },
    { path: '/monitoring', label: 'Monitoring', icon: 'monitor_heart' },
  ];
}
