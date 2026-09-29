import type { CheckStatus, MonitoredTarget } from '@fintrack/shared-types';

export interface CheckResult {
  target: MonitoredTarget;
  checkedAt: Date;
  status: CheckStatus;
  responseTimeMs: number | null;
  httpStatus: number | null;
  error: string | null;
}

/** Ruw HTTP-antwoord van een target, of `null` als er geen antwoord kwam (timeout/netwerk). */
export interface ProbeResponse {
  httpStatus: number;
  body: unknown;
}

export type Classification = Pick<CheckResult, 'status' | 'error'>;
