import type { UptimeWindow } from '@fintrack/shared-types';

const HOUR_S = 60 * 60;

/** Periode en bucketgrootte per venster: telkens ~120–300 punten, genoeg voor een grafiek. */
export const WINDOW_CONFIG: Record<UptimeWindow, { seconds: number; bucketSeconds: number }> = {
  '24h': { seconds: 24 * HOUR_S, bucketSeconds: 5 * 60 },
  '7d': { seconds: 7 * 24 * HOUR_S, bucketSeconds: HOUR_S },
  '30d': { seconds: 30 * 24 * HOUR_S, bucketSeconds: 6 * HOUR_S },
};

export function windowStart(window: UptimeWindow, now = new Date()): Date {
  return new Date(now.getTime() - WINDOW_CONFIG[window].seconds * 1000);
}
