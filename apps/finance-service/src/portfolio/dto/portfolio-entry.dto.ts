import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxDate,
  MaxLength,
  Min,
} from 'class-validator';
import { COIN_ID_PATTERN } from '../../prices/dto/prices-query.dto.js';

// Komt overeen met de schaal van de Decimal(30, 10)-kolommen.
const DECIMALS = { maxDecimalPlaces: 10, allowNaN: false, allowInfinity: false };

export class CreatePortfolioEntryDto {
  @Matches(COIN_ID_PATTERN, { message: 'coinId moet een geldige CoinGecko-id zijn' })
  coinId: string;

  @IsNumber(DECIMALS)
  @IsPositive()
  amount: number;

  @IsNumber(DECIMALS)
  @Min(0)
  buyPriceUsd: number;

  @Type(() => Date)
  @IsDate({ message: 'boughtAt moet een geldige datum zijn (ISO 8601)' })
  @MaxDate(() => new Date(), { message: 'boughtAt mag niet in de toekomst liggen' })
  boughtAt: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdatePortfolioEntryDto extends PartialType(CreatePortfolioEntryDto) {}
