import type {
  CheckSeries,
  HealthReport,
  Incident,
  MonitoringStatus,
  TargetStatus,
  TargetUptime,
} from '@fintrack/shared-types';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { setFinanceHealth } from '../../support/health-target-mock.js';
import { alertSubjects, clearE2eAlerts } from '../../support/mailpit.js';
import { readMetric } from '../../support/metrics.js';

// monitoring-service pollt hier elke seconde; een incident opent na 2 mislukte checks.
const POLL = { timeout: 15_000, intervals: [250] };

async function financeStatus(request: APIRequestContext): Promise<TargetStatus> {
  const body = (await (await request.get('/api/status')).json()) as MonitoringStatus;
  const target = body.targets.find((t) => t.target === 'finance-service');
  if (!target) throw new Error('finance-service ontbreekt in /api/status');
  return target;
}

async function latestFinanceIncident(request: APIRequestContext): Promise<Incident | undefined> {
  const incidents = (await (await request.get('/api/incidents')).json()) as Incident[];
  return incidents.find((incident) => incident.target === 'finance-service');
}

test.beforeAll(async ({ request }) => {
  await clearE2eAlerts(request);
});

test.afterEach(async ({ request }) => {
  await setFinanceHealth(request, 'ok');
});

test('GET /api/status toont beide targets zodra de eerste checks binnen zijn', async ({
  request,
}) => {
  await expect.poll(async () => (await financeStatus(request)).status, POLL).toBe('up');

  const body = (await (await request.get('/api/status')).json()) as MonitoringStatus;
  expect(body.targets.map((t) => t.target)).toEqual(['finance-service', 'coingecko']);
  expect(body.targets[0]).toMatchObject({
    status: 'up',
    lastCheckedAt: expect.any(String),
    responseTimeMs: expect.any(Number),
    error: null,
    openIncident: null,
  });
});

test('down → incident + alert-mail, herstel → incident gesloten + herstelmail', async ({
  request,
}) => {
  await expect.poll(async () => (await financeStatus(request)).status, POLL).toBe('up');

  await setFinanceHealth(request, 'down');

  await expect.poll(async () => (await financeStatus(request)).openIncident, POLL).not.toBeNull();
  const down = await financeStatus(request);
  expect(down.status).toBe('down');
  expect(down.openIncident?.cause).toBe('HTTP 503: database down');
  await expect
    .poll(() => alertSubjects(request, 'finance-service is down'), POLL)
    .toEqual(['🔴 [FinTrack] finance-service is down']);

  await setFinanceHealth(request, 'ok');

  await expect.poll(async () => (await financeStatus(request)).openIncident, POLL).toBeNull();
  const incident = await latestFinanceIncident(request);
  expect(incident).toMatchObject({
    resolvedAt: expect.any(String),
    cause: 'HTTP 503: database down',
    alertSent: true,
  });
  expect(incident?.durationSeconds).toBeGreaterThanOrEqual(1);
  await expect
    .poll(() => alertSubjects(request, 'finance-service is hersteld'), POLL)
    .toHaveLength(1);
});

test('degraded opent geen incident', async ({ request }) => {
  const incidentsBefore = ((await (await request.get('/api/incidents')).json()) as Incident[])
    .length;

  await setFinanceHealth(request, 'degraded');

  await expect.poll(async () => (await financeStatus(request)).status, POLL).toBe('degraded');
  // Nog een paar polls laten passeren: er mag geen incident bijkomen.
  await new Promise((resolve) => setTimeout(resolve, 2_500));
  const status = await financeStatus(request);
  expect(status).toMatchObject({ status: 'degraded', error: 'coingecko down', openIncident: null });
  const incidentsAfter = ((await (await request.get('/api/incidents')).json()) as Incident[]).length;
  expect(incidentsAfter).toBe(incidentsBefore);
});

test('GET /api/uptime geeft uptime en responstijden per target', async ({ request }) => {
  const response = await request.get('/api/uptime?window=24h');

  expect(response.status()).toBe(200);
  const body = (await response.json()) as TargetUptime[];
  expect(body.map((u) => u.target)).toEqual(['finance-service', 'coingecko']);
  const finance = body[0];
  expect(finance.window).toBe('24h');
  expect(finance.checks).toBeGreaterThan(0);
  // Eerdere tests zetten finance-service even down: uptime ligt dus onder 100%.
  expect(finance.uptimePct).toBeGreaterThan(0);
  expect(finance.uptimePct).toBeLessThan(100);
  expect(finance.p95ResponseTimeMs).toBeGreaterThanOrEqual(0);
});

test('GET /api/checks geeft een tijdreeks in buckets van 5 minuten', async ({ request }) => {
  const response = await request.get('/api/checks?target=finance-service&window=24h');

  expect(response.status()).toBe(200);
  const body = (await response.json()) as CheckSeries;
  expect(body).toMatchObject({ target: 'finance-service', window: '24h', bucketSeconds: 300 });
  expect(body.buckets.length).toBeGreaterThan(0);
  const bucket = body.buckets.at(-1);
  expect(new Date(bucket?.bucketStart ?? '').getTime() % 300_000).toBe(0);
  expect(body.buckets.some((b) => b.worstStatus === 'down')).toBe(true);
});

test.describe('validatie', () => {
  for (const url of [
    '/api/uptime?window=1y',
    '/api/checks?window=24h',
    '/api/checks?target=onbekend',
    '/api/incidents?limit=0',
    '/api/incidents?limit=101',
  ]) {
    test(`weigert ${url} met 400`, async ({ request }) => {
      expect((await request.get(url)).status()).toBe(400);
    });
  }
});

test('GET /health meldt database en poller', async ({ request }) => {
  const response = await request.get('/health');

  expect(response.status()).toBe(200);
  expect((await response.json()) as HealthReport).toMatchObject({
    status: 'ok',
    service: 'monitoring-service',
    dependencies: { database: { status: 'up' }, poller: { status: 'up' } },
  });
});

test('GET /metrics bevat de status per target', async ({ request }) => {
  await setFinanceHealth(request, 'ok');
  await expect.poll(async () => (await financeStatus(request)).status, POLL).toBe('up');

  const metrics = await (await request.get('/metrics')).text();

  expect(readMetric(metrics, 'monitored_target_status{target="finance-service"}')).toBe(1);
  expect(metrics).toContain('# TYPE monitored_target_response_seconds histogram');
  expect(metrics).toContain('monitoring_alerts_total{type="opened",result="sent"}');
});
