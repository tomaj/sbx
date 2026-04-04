import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import type { Response } from 'express';
import { StoryVersionsService } from './story-versions.service';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Story Versions - MAPI')
@Controller('v1/spaces/:spaceId/story_versions')
@Auth('session-or-token')
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
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(page, perPage);
    const resolvedPerPage = parsedPerPage;
    const result = await this.storyVersionsService.listVersions({
      spaceId: parseInt(spaceId),
      storyId: parseInt(byStoryId),
      releaseId: byReleaseId !== undefined ? parseInt(byReleaseId) : undefined,
      page: parsedPage,
      perPage: resolvedPerPage,
      showContent: showContent === 'true',
    });

    // Storyblok returns total + per-page in headers
    res!.setHeader('total', String(result.total));
    res!.setHeader('per-page', String(resolvedPerPage));
    res!.json({ story_versions: result.story_versions });
  }
}
