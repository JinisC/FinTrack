import pg from 'pg';
import { e2eDatabaseUrl } from './env.js';

/** Tabellen die elke testrun leeg moeten starten (bestaan pas na de eerste migratie). */
const TABLES = ['finance.portfolio_entries', 'monitoring.health_checks', 'monitoring.incidents'];

/**
 * Maakt de e2e-database leeg vóór de tests, zodat een run niet afhangt van data die een
 * vorige (mislukte) run achterliet. Draait na het opstarten van de webServers (en dus na
 * `prisma migrate deploy`).
 */
export default async function globalSetup(): Promise<void> {
  const client = new pg.Client({ connectionString: e2eDatabaseUrl });
  await client.connect();
  try {
    for (const table of TABLES) {
      const { rows } = await client.query<{ exists: boolean }>(
        'SELECT to_regclass($1) IS NOT NULL AS exists',
        [table],
      );
      if (rows[0]?.exists) {
        await client.query(`TRUNCATE ${table} RESTART IDENTITY CASCADE`);
      }
    }
  } finally {
    await client.end();
  }
}
