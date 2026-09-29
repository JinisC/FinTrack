import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEMO_USER } from './demo-user.js';

/** Zorgt dat de demo-gebruiker bestaat, zodat de portfolio-API ook zonder seed werkt. */
@Injectable()
export class DemoUserBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoUserBootstrap.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: DEMO_USER.id },
      create: DEMO_USER,
      update: {},
    });
    this.logger.log(`Demo-gebruiker ${DEMO_USER.email} is beschikbaar`);
  }
}
