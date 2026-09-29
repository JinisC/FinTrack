import { formatDuration, incidentOpenedEmail, incidentResolvedEmail } from './alert-email.js';

const incident = {
  target: 'finance-service',
  startedAt: new Date('2026-01-01T12:00:00.000Z'),
  cause: 'HTTP 503: database down',
};

describe('alert-mails', () => {
  it('down-mail noemt target, starttijd en oorzaak', () => {
    const mail = incidentOpenedEmail(incident);

    expect(mail.subject).toBe('🔴 [FinTrack] finance-service is down');
    expect(mail.text).toContain('2026-01-01 12:00:00 UTC');
    expect(mail.text).toContain('HTTP 503: database down');
  });

  it('herstelmail noemt de duur in het onderwerp', () => {
    const mail = incidentResolvedEmail(incident, new Date('2026-01-01T12:04:10.000Z'));

    expect(mail.subject).toBe('✅ [FinTrack] finance-service is hersteld (na 4 min 10 s)');
    expect(mail.text).toContain('Tot:       2026-01-01 12:04:10 UTC');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0 s'],
    [45, '45 s'],
    [60, '1 min'],
    [250, '4 min 10 s'],
    [3600, '1 u'],
    [7500, '2 u 5 min'],
    [-3, '0 s'],
  ])('%i s → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
