import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { AlertEmail } from './alert-email.js';

export type SendResult = 'sent' | 'skipped' | 'failed';

@Injectable()
export class AlertMailerService {
  private readonly logger = new Logger(AlertMailerService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly to: string | undefined;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const port = config.get('SMTP_PORT', { infer: true });
    const user = config.get('SMTP_USER', { infer: true });
    this.transporter = createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port,
      secure: port === 465,
      auth: user ? { user, pass: config.get('SMTP_PASS', { infer: true }) } : undefined,
    });
    this.from = config.get('ALERT_EMAIL_FROM', { infer: true });
    this.to = config.get('ALERT_EMAIL_TO', { infer: true }) || undefined;
  }

  /** Verstuurt een alert. Faalt nooit: een mailprobleem mag het monitoren niet stoppen. */
  async send(email: AlertEmail): Promise<SendResult> {
    if (!this.to) {
      this.logger.warn(`Geen ALERT_EMAIL_TO ingesteld, alert enkel gelogd: ${email.subject}`);
      return 'skipped';
    }
    try {
      await this.transporter.sendMail({ from: this.from, to: this.to, ...email });
      this.logger.log(`Alert verstuurd naar ${this.to}: ${email.subject}`);
      return 'sent';
    } catch (err) {
      this.logger.error(`Alert versturen mislukt (${email.subject}): ${String(err)}`);
      return 'failed';
    }
  }
}
