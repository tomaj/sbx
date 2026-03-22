import { Module } from '@nestjs/common';
import { BridgeController } from './bridge.controller';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [BridgeController],
  providers: [SessionGuard],
})
export class BridgeModule {}
