import { Module } from '@nestjs/common';
import { InternalTagsController } from './internal-tags.controller';
import { InternalTagsService } from './internal-tags.service';

@Module({
  controllers: [InternalTagsController],
  providers: [InternalTagsService],
  exports: [InternalTagsService],
})
export class InternalTagsModule {}
