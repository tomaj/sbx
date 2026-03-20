import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [TagsController],
  providers: [TagsService, TokenGuard],
})
export class TagsModule {}
