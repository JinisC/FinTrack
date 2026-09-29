import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpMetricsInterceptor } from './http-metrics.interceptor.js';
import { MetricsController } from './metrics.controller.js';
import { MetricsRegistry } from './metrics-registry.js';

/**
 * Standaard-observability voor elke FinTrack-service: `GET /metrics` in Prometheus-formaat,
 * Node-runtime-metrics en een duur-histogram voor alle HTTP-requests.
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsRegistry, { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor }],
  exports: [MetricsRegistry],
})
export class ObservabilityModule {}
