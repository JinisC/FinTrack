import type { Incident as IncidentRecord } from '../generated/prisma/client.js';
import { toCheckBucket, toIncident, toTargetUptime } from './mappers.js';

describe('toTargetUptime', () => {
  it('berekent uptime-% met 2 decimalen en rondt responstijden af', () => {
    expect(
      toTargetUptime('finance-service', '24h', {
        target: 'finance-service',
        checks: 12,
        available: 7,
        avg_ms: 88.6,
        p95_ms: 299.5,
      }),
    ).toEqual({
      target: 'finance-service',
      window: '24h',
      checks: 12,
      uptimePct: 58.33,
      avgResponseTimeMs: 89,
      p95ResponseTimeMs: 300,
    });
  });

  it('geeft null-waarden voor een target zonder checks', () => {
    expect(toTargetUptime('coingecko', '7d', undefined)).toEqual({
      target: 'coingecko',
      window: '7d',
      checks: 0,
      uptimePct: null,
      avgResponseTimeMs: null,
      p95ResponseTimeMs: null,
    });
  });

  it('laat responstijd null als geen enkele check een antwoord kreeg', () => {
    const uptime = toTargetUptime('coingecko', '24h', {
      target: 'coingecko',
      checks: 3,
      available: 0,
      avg_ms: null,
      p95_ms: null,
    });
    expect(uptime).toMatchObject({ uptimePct: 0, avgResponseTimeMs: null });
  });
});

describe('toCheckBucket', () => {
  it.each([
    [0, 'up'],
    [1, 'degraded'],
    [2, 'down'],
  ] as const)('ernst %i → %s', (worst, status) => {
    const bucket = toCheckBucket({
      bucket_start: new Date('2026-01-01T12:05:00.000Z'),
      checks: 10,
      avg_ms: 12.4,
      worst,
    });
    expect(bucket).toEqual({
      bucketStart: '2026-01-01T12:05:00.000Z',
      checks: 10,
      avgResponseTimeMs: 12,
      worstStatus: status,
    });
  });
});

describe('toIncident', () => {
  const base: IncidentRecord = {
    id: 'i1',
    target: 'finance-service',
    startedAt: new Date('2026-01-01T12:00:00.000Z'),
    resolvedAt: null,
    cause: 'boem',
    alertSentAt: new Date('2026-01-01T12:00:30.000Z'),
    resolvedAlertSentAt: null,
  };

  it('rekent de duur van een lopend incident tot nu', () => {
    const incident = toIncident(base, new Date('2026-01-01T12:10:00.000Z'));

    expect(incident).toMatchObject({ resolvedAt: null, durationSeconds: 600, alertSent: true });
  });

  it('rekent de duur van een opgelost incident tot het herstel', () => {
    const incident = toIncident(
      { ...base, resolvedAt: new Date('2026-01-01T12:01:05.000Z'), alertSentAt: null },
      new Date('2026-01-02T00:00:00.000Z'),
    );

    expect(incident).toMatchObject({
      resolvedAt: '2026-01-01T12:01:05.000Z',
      durationSeconds: 65,
      alertSent: false,
    });
  });
});
