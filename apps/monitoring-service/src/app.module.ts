import { ObservabilityModule } from '@fintrack/nest-observability';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ApiModule } from './api/api.module.js';
import { ChecksModule } from './checks/checks.module.js';
import { validateEnv } from './config/env.validation.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    ObservabilityModule,
    PrismaModule,
    ChecksModule,
    ApiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
