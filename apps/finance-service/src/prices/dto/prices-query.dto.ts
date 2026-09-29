import { Type } from 'class-transformer';
import { IsIn, IsInt, Matches, Max, Min } from 'class-validator';

export const HISTORY_DAYS = [1, 7, 14, 30, 90, 365] as const;

export class TopCoinsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

export class CoinParamsDto {
  /** CoinGecko-id, bv. "bitcoin" of "shiba-inu". */
  @Matches(/^[a-z0-9-]{1,100}$/, { message: 'id moet een geldige CoinGecko-id zijn' })
  id: string;
}

export class HistoryQueryDto {
  @Type(() => Number)
  @IsIn(HISTORY_DAYS)
  days: number = 7;
}
