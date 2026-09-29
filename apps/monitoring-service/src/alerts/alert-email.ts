export interface AlertEmail {
  subject: string;
  text: string;
}

interface IncidentInfo {
  target: string;
  startedAt: Date;
  cause: string;
}

export function incidentOpenedEmail(incident: IncidentInfo): AlertEmail {
  return {
    subject: `🔴 [FinTrack] ${incident.target} is down`,
    text: [
      `${incident.target} is niet bereikbaar.`,
      '',
      `Sinds:   ${formatTimestamp(incident.startedAt)}`,
      `Oorzaak: ${incident.cause}`,
      '',
      'Je krijgt een nieuwe mail zodra de service hersteld is.',
    ].join('\n'),
  };
}

export function incidentResolvedEmail(incident: IncidentInfo, resolvedAt: Date): AlertEmail {
  const duration = formatDuration((resolvedAt.getTime() - incident.startedAt.getTime()) / 1000);
  return {
    subject: `✅ [FinTrack] ${incident.target} is hersteld (na ${duration})`,
    text: [
      `${incident.target} is weer bereikbaar.`,
      '',
      `Down van:  ${formatTimestamp(incident.startedAt)}`,
      `Tot:       ${formatTimestamp(resolvedAt)}`,
      `Duur:      ${duration}`,
      `Oorzaak:   ${incident.cause}`,
    ].join('\n'),
  };
}

/** Bv. "45 s", "4 min 10 s", "2 u 5 min". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return minutes > 0 ? `${hours} u ${minutes} min` : `${hours} u`;
  if (minutes > 0) return rest > 0 ? `${minutes} min ${rest} s` : `${minutes} min`;
  return `${rest} s`;
}

function formatTimestamp(date: Date): string {
  return `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}
