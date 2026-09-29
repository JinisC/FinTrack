import type { CheckResult } from '../checks/check-result.js';

/** Toestand per target tussen twee checks. */
export interface TrackerState {
  consecutiveFailures: number;
  /** Tijdstip van de eerste `down`-check in de huidige reeks. */
  firstFailureAt: Date | null;
  openIncidentId: string | null;
}

export type IncidentAction =
  | { type: 'none' }
  | { type: 'open'; startedAt: Date; cause: string }
  | { type: 'resolve'; incidentId: string; resolvedAt: Date };

export const INITIAL_TRACKER_STATE: TrackerState = {
  consecutiveFailures: 0,
  firstFailureAt: null,
  openIncidentId: null,
};

/**
 * Pure state machine: bepaalt na elke check of er een incident geopend of gesloten moet worden.
 * - Pas na `threshold` opeenvolgende `down`-checks gaat een incident open (geen alert bij één
 *   toevallige time-out); het incident start op het tijdstip van de eerste mislukte check.
 * - `up` én `degraded` sluiten een open incident: de target is weer bereikbaar.
 */
export function evaluateCheck(
  state: TrackerState,
  check: Pick<CheckResult, 'status' | 'checkedAt' | 'error'>,
  threshold: number,
): { state: TrackerState; action: IncidentAction } {
  if (check.status !== 'down') {
    const action: IncidentAction = state.openIncidentId
      ? { type: 'resolve', incidentId: state.openIncidentId, resolvedAt: check.checkedAt }
      : { type: 'none' };
    return { state: INITIAL_TRACKER_STATE, action };
  }

  const next: TrackerState = {
    ...state,
    consecutiveFailures: state.consecutiveFailures + 1,
    firstFailureAt: state.firstFailureAt ?? check.checkedAt,
  };
  if (!next.openIncidentId && next.consecutiveFailures >= threshold) {
    return {
      state: next,
      action: {
        type: 'open',
        startedAt: next.firstFailureAt ?? check.checkedAt,
        cause: check.error ?? 'Onbekende fout',
      },
    };
  }
  return { state: next, action: { type: 'none' } };
}
