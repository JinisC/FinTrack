import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service.js';

/** Meet de duur van elk HTTP-request, gelabeld per route-patroon (niet per concrete URL). */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const endTimer = this.metrics.httpRequestDuration.startTimer({ method: req.method });
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
