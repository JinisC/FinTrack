import { Module } from '@nestjs/common';
import { CoinGeckoModule } from '../coingecko/coingecko.module.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  imports: [CoinGeckoModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
