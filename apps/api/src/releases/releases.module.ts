import { Module } from '@nestjs/common';
import { ReleasesController } from './releases.controller';
import { ReleasesService } from './releases.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [ReleasesController],
  providers: [ReleasesService, TokenGuard, SessionOrTokenGuard],
})
export class ReleasesModule {}
