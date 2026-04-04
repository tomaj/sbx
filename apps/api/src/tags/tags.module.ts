import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsMAPIController } from './tags-mapi.controller';
import { TagsService } from './tags.service';

@Module({
  controllers: [TagsController, TagsMAPIController],
  providers: [TagsService],
})
export class TagsModule {}
