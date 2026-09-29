import { ObservabilityModule } from '@fintrack/nest-observability';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { PortfolioModule } from './portfolio/portfolio.module.js';
import { PricesModule } from './prices/prices.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ObservabilityModule,
    PrismaModule,
    MetricsModule,
    HealthModule,
    UsersModule,
    PricesModule,
    PortfolioModule,
  ],
})
export class AppModule {}
