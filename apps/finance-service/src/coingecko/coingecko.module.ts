import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { CoinGeckoClient } from './coingecko.client.js';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const apiKey = config.get('COINGECKO_API_KEY', { infer: true });
        return {
          baseURL: config.get('COINGECKO_BASE_URL', { infer: true }),
          timeout: config.get('COINGECKO_TIMEOUT_MS', { infer: true }),
          headers: {
            Accept: 'application/json',
            ...(apiKey ? { 'x-cg-demo-api-key': apiKey } : {}),
          },
        };
      },
    }),
  ],
  providers: [CoinGeckoClient],
  exports: [CoinGeckoClient],
})
export class CoinGeckoModule {}
