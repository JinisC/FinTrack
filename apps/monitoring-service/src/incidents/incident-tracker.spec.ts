import type { CheckStatus } from '@fintrack/shared-types';
import {
  type IncidentAction,
  INITIAL_TRACKER_STATE,
  type TrackerState,
  evaluateCheck,
} from './incident-tracker.js';

const at = (second: number) => new Date(Date.UTC(2026, 0, 1, 12, 0, second));

/** Speelt een reeks checks af en geeft alle acties terug. */
function run(
  statuses: CheckStatus[],
  threshold = 2,
  initial: TrackerState = INITIAL_TRACKER_STATE,
): { actions: IncidentAction[]; state: TrackerState } {
  let state = initial;
  const actions: IncidentAction[] = [];
  statuses.forEach((status, i) => {
    const result = evaluateCheck(state, { status, checkedAt: at(i * 10), error: 'boem' }, threshold);
    actions.push(result.action);
    state = result.state;
    // De service vult het id in na het aanmaken van het incident.
    if (result.action.type === 'open') state = { ...state, openIncidentId: `incident-${i}` };
  });
  return { actions, state };
}

describe('evaluateCheck', () => {
  it('doet niets zolang alles up is', () => {
    expect(run(['up', 'up', 'degraded']).actions.every((a) => a.type === 'none')).toBe(true);
  });

  it('opent geen incident bij één toevallige fout', () => {
    expect(run(['up', 'down', 'up']).actions.map((a) => a.type)).toEqual(['none', 'none', 'none']);
  });

  it('opent een incident na het drempelaantal fouten, gestart bij de eerste fout', () => {
    const { actions } = run(['up', 'down', 'down']);

    expect(actions[2]).toEqual({ type: 'open', startedAt: at(10), cause: 'boem' });
  });

  it('opent maar één incident, ook als de storing lang duurt', () => {
    const types = run(['down', 'down', 'down', 'down', 'down']).actions.map((a) => a.type);
    expect(types).toEqual(['none', 'open', 'none', 'none', 'none']);
  });

  it('sluit het incident bij de eerste check die weer up is', () => {
    const { actions, state } = run(['down', 'down', 'down', 'up']);

    expect(actions[3]).toEqual({ type: 'resolve', incidentId: 'incident-1', resolvedAt: at(30) });
    expect(state).toEqual(INITIAL_TRACKER_STATE);
  });

  it('degraded telt als hersteld (target is weer bereikbaar)', () => {
    expect(run(['down', 'down', 'degraded']).actions[2].type).toBe('resolve');
  });

  it('degraded telt niet mee als fout', () => {
    expect(run(['degraded', 'degraded', 'degraded']).actions.every((a) => a.type === 'none')).toBe(
      true,
    );
  });

  it('respecteert een drempel van 1', () => {
    expect(run(['down'], 1).actions[0].type).toBe('open');
  });

  it('hervat een open incident na herstart zonder een nieuw te openen', () => {
    const resumed: TrackerState = { ...INITIAL_TRACKER_STATE, openIncidentId: 'bestaand' };

    const { actions } = run(['down', 'down', 'up'], 2, resumed);

    expect(actions.map((a) => a.type)).toEqual(['none', 'none', 'resolve']);
    expect(actions[2]).toMatchObject({ incidentId: 'bestaand' });
  });
});
