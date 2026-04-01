import { Module } from '@nestjs/common';
import { StorySchedulingsController } from './story-schedulings.controller';
import { StorySchedulingsService } from './story-schedulings.service';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [StorySchedulingsController],
  providers: [StorySchedulingsService, SessionOrTokenGuard],
})
export class StorySchedulingsModule {}
