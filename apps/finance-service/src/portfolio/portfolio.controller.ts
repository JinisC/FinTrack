import type { PortfolioEntry, PortfolioSummary } from '@fintrack/shared-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUserId } from '../users/current-user-id.decorator.js';
import { CreatePortfolioEntryDto, UpdatePortfolioEntryDto } from './dto/portfolio-entry.dto.js';
import { PortfolioService } from './portfolio.service.js';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get()
  getSummary(@CurrentUserId() userId: string): Promise<PortfolioSummary> {
    return this.portfolio.getSummary(userId);
  }

  @Post('entries')
  create(
    @CurrentUserId() userId: string,
    @Body() dto: CreatePortfolioEntryDto,
  ): Promise<PortfolioEntry> {
    return this.portfolio.create(userId, dto);
  }

  @Patch('entries/:id')
  update(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePortfolioEntryDto,
  ): Promise<PortfolioEntry> {
    return this.portfolio.update(userId, id, dto);
  }

  @Delete('entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.portfolio.remove(userId, id);
  }
}
