/**
 * Vult de database met de demo-gebruiker en een paar voorbeeld-entries.
 * Idempotent: bestaande entries van de demo-gebruiker worden eerst verwijderd.
 *
 * Gebruik: pnpm --filter @fintrack/finance-service db:seed
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { DEMO_USER } from '../src/users/demo-user.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const entries = [
  { coinId: 'bitcoin', amount: 0.15, buyPriceUsd: 42000, boughtAt: '2024-01-15', note: 'Eerste aankoop' },
  { coinId: 'bitcoin', amount: 0.05, buyPriceUsd: 68000, boughtAt: '2025-03-02' },
  { coinId: 'ethereum', amount: 2.5, buyPriceUsd: 3100, boughtAt: '2024-06-20' },
  { coinId: 'solana', amount: 40, buyPriceUsd: 95, boughtAt: '2024-09-10', note: 'DCA' },
];

async function main(): Promise<void> {
  await prisma.user.upsert({ where: { id: DEMO_USER.id }, create: DEMO_USER, update: {} });
  await prisma.portfolioEntry.deleteMany({ where: { userId: DEMO_USER.id } });
  await prisma.portfolioEntry.createMany({
    data: entries.map((e) => ({ ...e, boughtAt: new Date(e.boughtAt), userId: DEMO_USER.id })),
  });
  console.log(`Seed klaar: ${entries.length} entries voor ${DEMO_USER.email}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
