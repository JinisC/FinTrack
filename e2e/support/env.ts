export const MOCK_PORT = 4010;
export const FINANCE_PORT = 3100;

export const coingeckoMockUrl = `http://localhost:${MOCK_PORT}`;
export const financeServiceUrl = `http://localhost:${FINANCE_PORT}`;

/** Aparte testdatabase uit docker-compose (zie docker/postgres/init.sql). */
export const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgresql://fintrack:fintrack@localhost:5432/fintrack_e2e';
