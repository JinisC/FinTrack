import { Injectable } from '@nestjs/common';
import { Registry, collectDefaultMetrics } from '@prometheus-io/client';

/**
 * De Prometheus-registry van een service, inclusief de standaard Node-metrics (CPU, geheugen,
 * event loop, GC). Services registreren hun eigen metrics hierop via `registers: [registry]`.
 */
@Injectable()
export class MetricsRegistry extends Registry {
  constructor() {
    super();
    collectDefaultMetrics({ register: this });
  }
}
