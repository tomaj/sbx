import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { StoryVersionsService } from './story-versions.service';

@Controller('v1/spaces/:spaceId/story_versions')
@UseGuards(SessionOrTokenGuard)
export class StoryVersionsController {
  constructor(private readonly storyVersionsService: StoryVersionsService) {}

  @Get()
  list(
    @Param('spaceId') spaceId: string,
    @Query('by_story_id') byStoryId: string,
    @Query('by_release_id') byReleaseId?: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('show_content') showContent?: string,
  ) {
    return this.storyVersionsService.listVersions({
      spaceId: parseInt(spaceId),
      storyId: parseInt(byStoryId),
      releaseId: byReleaseId !== undefined ? parseInt(byReleaseId) : undefined,
      page: Math.max(1, parseInt(page) || 1),
      perPage: Math.min(100, parseInt(perPage) || 25),
      showContent: showContent === 'true',
    });
  }
}
