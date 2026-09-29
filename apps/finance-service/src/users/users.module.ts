import { Module } from '@nestjs/common';
import { DemoUserBootstrap } from './demo-user.bootstrap.js';

@Module({
  providers: [DemoUserBootstrap],
})
export class UsersModule {}
