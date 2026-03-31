import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { StoryVersionsService } from './story-versions.service';

@Controller('v1/spaces/:spaceId/story_versions')
@UseGuards(SessionOrTokenGuard)
export class StoryVersionsController {
  constructor(private readonly storyVersionsService: StoryVersionsService) {}

  @Get()
  async list(
    @Param('spaceId') spaceId: string,
    @Query('by_story_id') byStoryId: string,
    @Query('by_release_id') byReleaseId?: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('show_content') showContent?: string,
    @Res() res?: Response,
  ) {
    const resolvedPerPage = Math.min(100, parseInt(perPage) || 25);
    const result = await this.storyVersionsService.listVersions({
      spaceId: parseInt(spaceId),
      storyId: parseInt(byStoryId),
      releaseId: byReleaseId !== undefined ? parseInt(byReleaseId) : undefined,
      page: Math.max(1, parseInt(page) || 1),
      perPage: resolvedPerPage,
      showContent: showContent === 'true',
    });

    // Storyblok returns total + per-page in headers
    res!.setHeader('total', String(result.total));
    res!.setHeader('per-page', String(resolvedPerPage));
    res!.json({ story_versions: result.story_versions });
  }
}
