import { Module } from '@nestjs/common';
import { StorySchedulingsController } from './story-schedulings.controller';
import { StorySchedulingsService } from './story-schedulings.service';

@Module({
  controllers: [StorySchedulingsController],
  providers: [StorySchedulingsService],
})
export class StorySchedulingsModule {}
