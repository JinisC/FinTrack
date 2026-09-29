import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsRegistry } from './metrics-registry.js';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly registry: MetricsRegistry) {}

  @Get()
  async scrape(@Res({ passthrough: true }) res: Response): Promise<string> {
    res.type(this.registry.contentType);
    return this.registry.metrics();
  }
}
