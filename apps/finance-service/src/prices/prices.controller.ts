import type { CoinHistory, CoinPrice, PriceResponse } from '@fintrack/shared-types';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { CoinParamsDto, HistoryQueryDto, TopCoinsQueryDto } from './dto/prices-query.dto.js';
import { PricesService } from './prices.service.js';

@Controller('prices')
export class PricesController {
  constructor(private readonly prices: PricesService) {}

  @Get()
  getTopCoins(@Query() query: TopCoinsQueryDto): Promise<PriceResponse<CoinPrice[]>> {
    return this.prices.getTopCoins(query.limit);
  }

  @Get(':id/history')
  getHistory(
    @Param() params: CoinParamsDto,
    @Query() query: HistoryQueryDto,
  ): Promise<PriceResponse<CoinHistory>> {
    return this.prices.getHistory(params.id, query.days);
  }
}
