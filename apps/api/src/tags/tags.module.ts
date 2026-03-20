import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsAdminController } from './tags-admin.controller';
import { TagsService } from './tags.service';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [TagsController, TagsAdminController],
  providers: [TagsService, TokenGuard],
})
export class TagsModule {}
