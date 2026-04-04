import { Module } from '@nestjs/common';
import { BridgeController } from './bridge.controller';

@Module({
  controllers: [BridgeController],
  providers: [],
})
export class BridgeModule {}
