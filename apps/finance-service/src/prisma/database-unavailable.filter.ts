import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../generated/prisma/client.js';

/** Prisma-foutcodes voor een onbereikbare of wegvallende database. */
const CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

/**
 * Zet databasestoringen om naar 503 i.p.v. een generieke 500, zodat clients en de
 * monitoring-service "tijdelijk onbeschikbaar" kunnen onderscheiden van een bug.
 */
@Catch()
export class DatabaseUnavailableFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(DatabaseUnavailableFilter.name);

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (isDatabaseUnavailable(exception)) {
      this.logger.error(`Database niet beschikbaar: ${(exception as Error).message}`);
      super.catch(new ServiceUnavailableException('Database is tijdelijk niet beschikbaar'), host);
      return;
    }
    super.catch(exception, host);
  }
}

export function isDatabaseUnavailable(err: unknown): boolean {
  if (!(err instanceof Error) || err instanceof HttpException) return false;
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return CONNECTION_ERROR_CODES.has(err.code);
  }
  if (err instanceof Prisma.PrismaClientValidationError) return false;
  // Driver-adapterfouten (bv. pg "Connection terminated unexpectedly", ECONNREFUSED) komen
  // ongewrapt door Prisma heen; herkenbaar aan het clientVersion-veld of een netwerkfoutcode.
  const code = (err as { code?: unknown }).code;
  return 'clientVersion' in err || code === 'ECONNREFUSED' || code === 'ETIMEDOUT';
}
