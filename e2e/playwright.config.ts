import { defineConfig } from '@playwright/test';
import {
  FINANCE_PORT,
  MOCK_PORT,
  coingeckoMockUrl,
  e2eDatabaseUrl,
  financeServiceUrl,
} from './support/env.js';

export default defineConfig({
  testDir: './tests',
  globalSetup: './support/global-setup.ts',
  // De tests delen één service en één mock (met omschakelbare storingsmodus): serieel draaien.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  projects: [
    {
      name: 'finance-api',
      testDir: './tests/finance-service',
      use: { baseURL: financeServiceUrl },
    },
  ],
  webServer: [
    {
      name: 'coingecko-mock',
      command: 'node mocks/coingecko-mock.ts',
      url: `${coingeckoMockUrl}/ping`,
      env: { MOCK_PORT: String(MOCK_PORT) },
      reuseExistingServer: false,
    },
    {
      // Vereist een draaiende database (`pnpm db:up`); /health geeft 503 zolang die ontbreekt.
      name: 'finance-service',
      command: [
        'pnpm --filter @fintrack/shared-types build',
        'pnpm --filter @fintrack/finance-service build',
        'pnpm --filter @fintrack/finance-service db:deploy',
        'node ../apps/finance-service/dist/main.js',
      ].join(' && '),
      url: `${financeServiceUrl}/health`,
      env: {
        PORT: String(FINANCE_PORT),
        DATABASE_URL: e2eDatabaseUrl,
        COINGECKO_BASE_URL: coingeckoMockUrl,
        // Korte TTL zodat tests de cache kunnen laten verlopen; health pingt telkens opnieuw.
        CACHE_TTL_SECONDS: '1',
        HEALTH_UPSTREAM_CACHE_SECONDS: '0',
      },
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
