import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { CheckResult, ProbeResponse } from './check-result.js';
import type { TargetDefinition } from './targets.js';

/** Voert één check uit: HTTP GET met time-out, responstijd meten, antwoord classificeren. */
@Injectable()
export class TargetProberService {
  private readonly timeoutMs: number;

  constructor(
    private readonly http: HttpService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.timeoutMs = config.get('CHECK_TIMEOUT_MS', { infer: true });
  }

  async probe(target: TargetDefinition): Promise<CheckResult> {
    const checkedAt = new Date();
    const started = performance.now();
    let response: ProbeResponse | null = null;
    let error: string | undefined;

    try {
      const res = await firstValueFrom(
        this.http.get<unknown>(target.url, {
          headers: { Accept: 'application/json', ...target.headers },
          timeout: this.timeoutMs,
          // Elke HTTP-status is een geldig antwoord; de classificatie beslist wat "down" is.
          validateStatus: () => true,
        }),
      );
      response = { httpStatus: res.status, body: res.data };
    } catch (err) {
      error = describeError(err, this.timeoutMs);
    }

    const responseTimeMs = Math.round(performance.now() - started);
    return {
      target: target.name,
      checkedAt,
      // Zonder antwoord is een responstijd niet zinvol (het is de time-out of een snelle weigering).
      responseTimeMs: response ? responseTimeMs : null,
      httpStatus: response?.httpStatus ?? null,
      ...target.classify(response, error),
    };
  }
}

function describeError(err: unknown, timeoutMs: number): string {
  if (isAxiosError(err)) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return `Time-out na ${timeoutMs} ms`;
    }
    if (err.code === 'ECONNREFUSED') {
      return 'Verbinding geweigerd (service draait niet?)';
    }
    return err.code ? `${err.code}: ${err.message}` : err.message;
  }
  return err instanceof Error ? err.message : String(err);
}
