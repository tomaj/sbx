import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsMAPIController } from './tags-mapi.controller';
import { TagsService } from './tags.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [TagsController, TagsMAPIController],
  providers: [TagsService, TokenGuard, SessionOrTokenGuard],
})
export class TagsModule {}
