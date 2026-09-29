import { plainToInstance } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Max, Min, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsUrl({ require_tld: false })
  COINGECKO_BASE_URL: string = 'https://api.coingecko.com/api/v3';

  /** Optionele gratis "Demo"-key van CoinGecko: stabielere rate limit dan anoniem gebruik. */
  @IsOptional()
  @IsString()
  COINGECKO_API_KEY?: string;

  @IsInt()
  @Min(100)
  COINGECKO_TIMEOUT_MS: number = 5000;

  /** Hoe lang prijsdata vers blijft in de cache. */
  @IsInt()
  @Min(1)
  CACHE_TTL_SECONDS: number = 60;

  /** Hoe lang de CoinGecko-ping van /health hergebruikt wordt (spaart rate limit). */
  @IsInt()
  @Min(0)
  HEALTH_UPSTREAM_CACHE_SECONDS: number = 30;
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
