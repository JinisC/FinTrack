export const MOCK_PORT = 4010;
export const HEALTH_TARGET_MOCK_PORT = 4011;
export const FINANCE_PORT = 3100;
export const MONITORING_PORT = 3101;
export const FRONTEND_PORT = 4300;

export const coingeckoMockUrl = `http://localhost:${MOCK_PORT}`;
export const healthTargetMockUrl = `http://localhost:${HEALTH_TARGET_MOCK_PORT}`;
export const financeServiceUrl = `http://localhost:${FINANCE_PORT}`;
export const monitoringServiceUrl = `http://localhost:${MONITORING_PORT}`;
export const frontendUrl = `http://localhost:${FRONTEND_PORT}`;

/** Aparte testdatabase uit docker-compose (zie docker/postgres/init.sql). */
export const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgresql://fintrack:fintrack@localhost:5432/fintrack_e2e';

/** Mailpit uit docker-compose; de tests zoeken enkel mails naar dit adres. */
export const mailpitUrl = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
export const e2eAlertAddress = 'e2e-alerts@fintrack.test';
