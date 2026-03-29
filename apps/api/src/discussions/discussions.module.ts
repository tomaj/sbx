import { Module } from '@nestjs/common';
import { DiscussionsController } from './discussions.controller';
import { DiscussionsService } from './discussions.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
@Module({
  controllers: [DiscussionsController],
  providers: [DiscussionsService, TokenGuard, SessionOrTokenGuard],
})
export class DiscussionsModule {}
