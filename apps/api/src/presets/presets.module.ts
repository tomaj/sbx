import { Module } from '@nestjs/common';
import { PresetsController } from './presets.controller';
import { PresetsService } from './presets.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [PresetsController],
  providers: [PresetsService, TokenGuard, SessionOrTokenGuard],
})
export class PresetsModule {}
