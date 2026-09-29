import type { MonitoredTarget } from '@fintrack/shared-types';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { incidentOpenedEmail, incidentResolvedEmail } from '../alerts/alert-email.js';
import { AlertMailerService } from '../alerts/alert-mailer.service.js';
import type { CheckResult } from '../checks/check-result.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { MonitoringMetricsService } from '../metrics/monitoring-metrics.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { INITIAL_TRACKER_STATE, type TrackerState, evaluateCheck } from './incident-tracker.js';

/** Koppelt de pure incident-state-machine aan de database en de alert-mails. */
@Injectable()
export class IncidentsService implements OnModuleInit {
  private readonly logger = new Logger(IncidentsService.name);
  private readonly threshold: number;
  private readonly states = new Map<MonitoredTarget, TrackerState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: AlertMailerService,
    private readonly metrics: MonitoringMetricsService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.threshold = config.get('ALERT_AFTER_FAILURES', { infer: true });
  }

  /** Na een herstart lopen open incidenten gewoon door: geen dubbele "down"-alert. */
  async onModuleInit(): Promise<void> {
    const open = await this.prisma.incident.findMany({ where: { resolvedAt: null } });
    for (const incident of open) {
      this.states.set(incident.target as MonitoredTarget, {
        ...INITIAL_TRACKER_STATE,
        openIncidentId: incident.id,
      });
    }
    if (open.length > 0) {
      this.logger.warn(`${open.length} open incident(en) hervat na herstart`);
    }
  }

  async handleCheck(check: CheckResult): Promise<void> {
    const current = this.states.get(check.target) ?? INITIAL_TRACKER_STATE;
    const { state, action } = evaluateCheck(current, check, this.threshold);

    switch (action.type) {
      case 'open': {
        const incident = await this.prisma.incident.create({
          data: { target: check.target, startedAt: action.startedAt, cause: action.cause },
        });
        state.openIncidentId = incident.id;
        this.logger.error(`Incident geopend voor ${check.target}: ${action.cause}`);
        const result = await this.mailer.send(incidentOpenedEmail(incident));
        this.metrics.alertsSent.inc({ type: 'opened', result });
        if (result === 'sent') {
          await this.prisma.incident.update({
            where: { id: incident.id },
            data: { alertSentAt: new Date() },
          });
        }
        break;
      }
      case 'resolve': {
        const incident = await this.prisma.incident.update({
          where: { id: action.incidentId },
          data: { resolvedAt: action.resolvedAt },
        });
        this.logger.log(`Incident voor ${check.target} gesloten`);
        const result = await this.mailer.send(incidentResolvedEmail(incident, action.resolvedAt));
        this.metrics.alertsSent.inc({ type: 'resolved', result });
        if (result === 'sent') {
          await this.prisma.incident.update({
            where: { id: incident.id },
            data: { resolvedAlertSentAt: new Date() },
          });
        }
        break;
      }
      case 'none':
        break;
    }

    this.states.set(check.target, state);
  }
}
