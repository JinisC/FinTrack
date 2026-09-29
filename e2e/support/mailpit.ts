import type { APIRequestContext } from '@playwright/test';
import { e2eAlertAddress, mailpitUrl } from './env.js';

interface MailpitSearchResult {
  messages_count: number;
  messages: { ID: string; Subject: string }[];
}

const forE2e = (extra = '') => encodeURIComponent(`to:${e2eAlertAddress} ${extra}`.trim());

/** Onderwerpen van alle e2e-alertmails die (ook) `subjectContains` bevatten. */
export async function alertSubjects(
  request: APIRequestContext,
  subjectContains: string,
): Promise<string[]> {
  const response = await request.get(
    `${mailpitUrl}/api/v1/search?query=${forE2e(`subject:"${subjectContains}"`)}`,
  );
  const body = (await response.json()) as MailpitSearchResult;
  return body.messages.map((message) => message.Subject);
}

/** Verwijdert enkel de mails van de e2e-tests; andere mails in Mailpit blijven staan. */
export async function clearE2eAlerts(request: APIRequestContext): Promise<void> {
  await request.delete(`${mailpitUrl}/api/v1/search?query=${forE2e()}`);
}
