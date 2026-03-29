import { Module } from '@nestjs/common';
import { InternalTagsController } from './internal-tags.controller';
import { InternalTagsService } from './internal-tags.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [InternalTagsController],
  providers: [InternalTagsService, TokenGuard, SessionOrTokenGuard],
  exports: [InternalTagsService],
})
export class InternalTagsModule {}
