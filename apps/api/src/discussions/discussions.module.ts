import { Module } from '@nestjs/common';
import {
  DiscussionsController,
  StoryDiscussionsController,
  MentionedDiscussionsController,
} from './discussions.controller';
import { DiscussionsService } from './discussions.service';

@Module({
  controllers: [
    StoryDiscussionsController,
    MentionedDiscussionsController,
    DiscussionsController,
  ],
  providers: [DiscussionsService],
})
export class DiscussionsModule {}
