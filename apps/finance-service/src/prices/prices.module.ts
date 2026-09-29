import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { CoinGeckoModule } from '../coingecko/coingecko.module.js';
import { PricesController } from './prices.controller.js';
import { PricesService } from './prices.service.js';

@Module({
  // In-memory cache; later te vervangen door een Redis-store zonder PricesService te wijzigen.
  imports: [CoinGeckoModule, CacheModule.register()],
  controllers: [PricesController],
  providers: [PricesService],
})
export class PricesModule {}
