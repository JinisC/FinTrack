import { plainToInstance } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @Matches(/^postgres(ql)?:\/\//, { message: 'DATABASE_URL moet een PostgreSQL-URL zijn' })
  DATABASE_URL: string;

  @IsUrl({ require_tld: false })
  FINANCE_SERVICE_URL: string = 'http://localhost:3000';

  @IsUrl({ require_tld: false })
  COINGECKO_BASE_URL: string = 'https://api.coingecko.com/api/v3';

  @IsOptional()
  @IsString()
  COINGECKO_API_KEY?: string;

  @IsInt()
  @Min(1)
  POLL_INTERVAL_SECONDS: number = 30;

  /** CoinGecko apart (trager) pollen: de gratis rate limit is streng. */
  @IsInt()
  @Min(1)
  COINGECKO_POLL_INTERVAL_SECONDS: number = 60;

  @IsInt()
  @Min(100)
  CHECK_TIMEOUT_MS: number = 5000;

  /** Aantal opeenvolgende mislukte checks voor er een incident (en alert) komt. */
  @IsInt()
  @Min(1)
  ALERT_AFTER_FAILURES: number = 2;

  @IsInt()
  @Min(1)
  RETENTION_DAYS: number = 30;

  @IsString()
  SMTP_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number = 1025;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @IsString()
  ALERT_EMAIL_FROM: string = 'FinTrack Monitoring <monitoring@fintrack.local>';

  /** Leeg = alerts worden enkel gelogd. */
  @IsOptional()
  @ValidateIf((env: EnvironmentVariables) => !!env.ALERT_EMAIL_TO)
  @IsEmail()
  ALERT_EMAIL_TO?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated);
  if (errors.length > 0) {
    throw new Error(`Ongeldige configuratie:\n${errors.toString()}`);
  }
  return validated;
}
