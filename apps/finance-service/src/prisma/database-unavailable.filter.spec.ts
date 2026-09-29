import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { isDatabaseUnavailable } from './database-unavailable.filter.js';

const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('fout', { code, clientVersion: 'test' });

describe('isDatabaseUnavailable', () => {
  it.each([
    ['initialisatiefout', new Prisma.PrismaClientInitializationError('geen verbinding', 'test')],
    ['P1001 (server onbereikbaar)', known('P1001')],
    ['P1017 (verbinding gesloten)', known('P1017')],
    [
      'ruwe driverfout met clientVersion',
      Object.assign(new Error('Connection terminated unexpectedly'), { clientVersion: '7.10.0' }),
    ],
    ['ECONNREFUSED', Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })],
  ])('herkent %s als onbeschikbaar', (_label, err) => {
    expect(isDatabaseUnavailable(err)).toBe(true);
  });

  it.each([
    ['P2025 (record niet gevonden)', known('P2025')],
    ['P2002 (unique constraint)', known('P2002')],
    ['HTTP-exception', new NotFoundException()],
    ['gewone fout', new Error('bug')],
    ['geen Error', 'string'],
  ])('behandelt %s niet als databasestoring', (_label, err) => {
    expect(isDatabaseUnavailable(err)).toBe(false);
  });
});
