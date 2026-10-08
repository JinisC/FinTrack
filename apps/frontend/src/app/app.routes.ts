import type { Routes } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'prices' },
  {
    path: 'prices',
    title: 'Markt · FinTrack',
    loadComponent: () => import('./prices/prices-page').then((m) => m.PricesPage),
  },
  {
    path: 'prices/:id',
    title: 'Coin · FinTrack',
    loadComponent: () => import('./prices/coin-detail-page').then((m) => m.CoinDetailPage),
    // ECharts wordt pas geladen wanneer je een grafiek opent.
    providers: [
      provideEchartsCore({ echarts: () => import('./prices/echarts-setup').then((m) => m.echarts) }),
    ],
  },
  {
    path: 'portfolio',
    title: 'Portfolio · FinTrack',
    loadComponent: () => import('./portfolio/portfolio-page').then((m) => m.PortfolioPage),
  },
  {
    path: 'monitoring',
    title: 'Monitoring · FinTrack',
    loadComponent: () => import('./monitoring/monitoring-page').then((m) => m.MonitoringPage),
  },
  { path: '**', redirectTo: 'prices' },
];
