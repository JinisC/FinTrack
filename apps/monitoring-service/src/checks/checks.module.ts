import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AlertMailerService } from '../alerts/alert-mailer.service.js';
import { IncidentsService } from '../incidents/incidents.service.js';
import { MonitoringMetricsService } from '../metrics/monitoring-metrics.service.js';
import { PollerService } from './poller.service.js';
import { RetentionService } from './retention.service.js';
import { TargetProberService } from './target-prober.service.js';

@Module({
  imports: [HttpModule],
  providers: [
    TargetProberService,
    PollerService,
    RetentionService,
    IncidentsService,
    AlertMailerService,
    MonitoringMetricsService,
  ],
  exports: [PollerService],
})
export class ChecksModule {}
