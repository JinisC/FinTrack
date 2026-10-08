import { defineConfig, devices } from '@playwright/test';
import {
  FINANCE_PORT,
  FRONTEND_PORT,
  HEALTH_TARGET_MOCK_PORT,
  MOCK_PORT,
  MONITORING_PORT,
  coingeckoMockUrl,
  e2eAlertAddress,
  e2eDatabaseUrl,
  financeServiceUrl,
  frontendUrl,
  healthTargetMockUrl,
  monitoringServiceUrl,
} from './support/env.js';

export default defineConfig({
  testDir: './tests',
  globalSetup: './support/global-setup.ts',
  // De tests delen services en mocks (met omschakelbare storingsmodus): serieel draaien.
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
    {
      name: 'monitoring-api',
      testDir: './tests/monitoring-service',
      use: { baseURL: monitoringServiceUrl },
    },
    {
      // Browsertests van de Angular-app (vereist `playwright install chromium`).
      name: 'frontend',
      testDir: './tests/frontend',
      use: { ...devices['Desktop Chrome'], baseURL: frontendUrl },
    },
  ],
  // Vereist Postgres en Mailpit uit docker-compose (`pnpm db:up`).
  webServer: [
    {
      name: 'coingecko-mock',
      command: 'node mocks/coingecko-mock.ts',
      url: `${coingeckoMockUrl}/ping`,
      env: { MOCK_PORT: String(MOCK_PORT) },
      reuseExistingServer: false,
    },
    {
      name: 'health-target-mock',
      command: 'node mocks/health-target-mock.ts',
      url: `${healthTargetMockUrl}/health`,
      env: { MOCK_PORT: String(HEALTH_TARGET_MOCK_PORT) },
      reuseExistingServer: false,
    },
    {
      // /health geeft 503 zolang de database ontbreekt.
      name: 'finance-service',
      command: [
        'pnpm --filter @fintrack/shared-types --filter @fintrack/nest-observability build',
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
    {
      // Bewaakt de health-mock (i.p.v. de echte finance-service) zodat tests storingen sturen.
      name: 'monitoring-service',
      command: [
        'pnpm --filter @fintrack/shared-types --filter @fintrack/nest-observability build',
        'pnpm --filter @fintrack/monitoring-service build',
        'pnpm --filter @fintrack/monitoring-service db:deploy',
        'node ../apps/monitoring-service/dist/main.js',
      ].join(' && '),
      url: `${monitoringServiceUrl}/health`,
      env: {
        PORT: String(MONITORING_PORT),
        DATABASE_URL: `${e2eDatabaseUrl}?schema=monitoring`,
        FINANCE_SERVICE_URL: healthTargetMockUrl,
        COINGECKO_BASE_URL: coingeckoMockUrl,
        POLL_INTERVAL_SECONDS: '1',
        COINGECKO_POLL_INTERVAL_SECONDS: '1',
        CHECK_TIMEOUT_MS: '1000',
        ALERT_AFTER_FAILURES: '2',
        SMTP_HOST: 'localhost',
        SMTP_PORT: '1025',
        ALERT_EMAIL_TO: e2eAlertAddress,
      },
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      // Angular-dev-server; de proxy stuurt `/api` naar de e2e-finance-service.
      name: 'frontend',
      command: `pnpm --filter @fintrack/frontend exec ng serve --port ${FRONTEND_PORT}`,
      url: frontendUrl,
      env: { FINANCE_SERVICE_URL: financeServiceUrl, NG_CLI_ANALYTICS: 'false' },
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ],
});
