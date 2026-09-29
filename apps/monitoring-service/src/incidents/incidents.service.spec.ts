import { MetricsRegistry } from '@fintrack/nest-observability';
import { ConfigService } from '@nestjs/config';
import type { AlertMailerService } from '../alerts/alert-mailer.service.js';
import type { CheckResult } from '../checks/check-result.js';
import { MonitoringMetricsService } from '../metrics/monitoring-metrics.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { IncidentsService } from './incidents.service.js';

const check = (status: CheckResult['status'], second: number): CheckResult => ({
  target: 'finance-service',
  checkedAt: new Date(Date.UTC(2026, 0, 1, 12, 0, second)),
  status,
  responseTimeMs: status === 'down' ? null : 10,
  httpStatus: status === 'down' ? null : 200,
  error: status === 'down' ? 'Verbinding geweigerd' : null,
});

describe('IncidentsService', () => {
  let prisma: {
    incident: Record<'findMany' | 'create' | 'update', ReturnType<typeof vi.fn>>;
  };
  let mailer: { send: ReturnType<typeof vi.fn> };
  let service: IncidentsService;

  beforeEach(async () => {
    prisma = {
      incident: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'inc-1', ...data })),
        update: vi.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({
            id: where.id,
            target: 'finance-service',
            startedAt: new Date(Date.UTC(2026, 0, 1, 12, 0, 0)),
            cause: 'Verbinding geweigerd',
            ...data,
          }),
        ),
      },
    };
    mailer = { send: vi.fn().mockResolvedValue('sent') };
    service = new IncidentsService(
      prisma as unknown as PrismaService,
      mailer as unknown as AlertMailerService,
      new MonitoringMetricsService(new MetricsRegistry()),
      new ConfigService({ ALERT_AFTER_FAILURES: 2 }),
    );
    await service.onModuleInit();
  });

  it('opent een incident en mailt na twee fouten', async () => {
    await service.handleCheck(check('down', 0));
    expect(prisma.incident.create).not.toHaveBeenCalled();

    await service.handleCheck(check('down', 10));

    expect(prisma.incident.create).toHaveBeenCalledWith({
      data: {
        target: 'finance-service',
        startedAt: check('down', 0).checkedAt,
        cause: 'Verbinding geweigerd',
      },
    });
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: '🔴 [FinTrack] finance-service is down' }),
    );
    expect(prisma.incident.update).toHaveBeenCalledWith({
      where: { id: 'inc-1' },
      data: { alertSentAt: expect.any(Date) },
    });
  });

  it('sluit het incident en stuurt een herstelmail', async () => {
    await service.handleCheck(check('down', 0));
    await service.handleCheck(check('down', 10));
    mailer.send.mockClear();

    await service.handleCheck(check('up', 20));

    expect(prisma.incident.update).toHaveBeenCalledWith({
      where: { id: 'inc-1' },
      data: { resolvedAt: check('up', 20).checkedAt },
    });
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: '✅ [FinTrack] finance-service is hersteld (na 20 s)' }),
    );
  });

  it('markeert de alert niet als verstuurd als mailen mislukt', async () => {
    mailer.send.mockResolvedValue('failed');

    await service.handleCheck(check('down', 0));
    await service.handleCheck(check('down', 10));

    expect(prisma.incident.create).toHaveBeenCalled();
    expect(prisma.incident.update).not.toHaveBeenCalled();
  });

  it('hervat open incidenten na een herstart zonder nieuwe down-mail', async () => {
    prisma.incident.findMany.mockResolvedValue([{ id: 'oud', target: 'finance-service' }]);
    await service.onModuleInit();

    await service.handleCheck(check('down', 0));
    await service.handleCheck(check('down', 10));
    await service.handleCheck(check('up', 20));

    expect(prisma.incident.create).not.toHaveBeenCalled();
    expect(prisma.incident.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'oud' } }),
    );
    expect(mailer.send).toHaveBeenCalledTimes(1);
  });
});
