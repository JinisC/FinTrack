import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Histogram } from '@prometheus-io/client';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { MetricsRegistry } from './metrics-registry.js';

/** Meet de duur van elk HTTP-request, gelabeld per route-patroon (niet per concrete URL). */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  private readonly httpRequestDuration: Histogram<'method' | 'route' | 'status'>;

  constructor(registry: MetricsRegistry) {
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duur van inkomende HTTP-requests',
      labelNames: ['method', 'route', 'status'] as const,
      registers: [registry],
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const endTimer = this.httpRequestDuration.startTimer({ method: req.method });
    const route = (): string => (req.route as { path?: string } | undefined)?.path ?? 'unknown';

    return next.handle().pipe(
      tap({
        next: () => endTimer({ route: route(), status: String(res.statusCode) }),
        error: (err: unknown) => {
          // De exception filter zet de statuscode pas later, dus leiden we hem hier af.
          const status = err instanceof HttpException ? err.getStatus() : 500;
          endTimer({ route: route(), status: String(status) });
        },
      }),
    );
  }
}
