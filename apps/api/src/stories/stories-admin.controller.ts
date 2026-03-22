import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { StoriesService } from './stories.service';

@Controller('v1/admin/spaces/:spaceId')
@UseGuards(SessionGuard)
export class StoriesAdminController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get('stories/filter-options')
  getFilterOptions(@Param('spaceId') spaceId: string) {
    return this.storiesService.getFilterOptions(parseInt(spaceId));
  }

  @Get('stories/ancestors')
  getAncestors(@Param('spaceId') spaceId: string, @Query('story_id') storyId: string) {
    return this.storiesService.getAncestors(parseInt(spaceId), BigInt(storyId));
  }

  @Get('stories')
  list(
    @Param('spaceId') spaceId: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('search') search?: string,
    @Query('sort_field') sortField?: string,
    @Query('sort_dir') sortDir?: string,
    @Query('parent_id') parentId?: string,
    @Query('content_type') contentType?: string,
    @Query('tag') tag?: string,
    @Query('block') block?: string,
    @Query('published') published?: string,
    @Query('uuid') uuid?: string,
    @Query('story_id') storyId?: string,
  ) {
    const resolvedParentId = parentId === undefined ? undefined : (parentId ? BigInt(parentId) : null);
    const resolvedPublished =
      published === 'true' ? true : published === 'false' ? false : undefined;

    return this.storiesService.listStoriesAdmin(parseInt(spaceId), {
      page: Math.max(1, parseInt(page) || 1),
      perPage: Math.min(100, parseInt(perPage) || 25),
      search,
      sortField,
      sortDir: sortDir === 'desc' ? 'desc' : 'asc',
      parentId: resolvedParentId,
      contentType,
      tag,
      block,
      published: resolvedPublished,
      uuid,
      storyId: storyId ? parseInt(storyId) : undefined,
    });
  }

  @Get('stories/:storyId')
  async getStory(@Param('spaceId') spaceId: string, @Param('storyId') storyId: string) {
    const result = await this.storiesService.getStoryAdmin(parseInt(spaceId), parseInt(storyId));
    if (!result) throw new NotFoundException('Story not found');
    return result;
  }

  @Patch('stories/:storyId')
  updateStory(
    @Param('spaceId') spaceId: string,
    @Param('storyId') storyId: string,
    @Body() body: {
      content?: Record<string, any>;
      name?: string;
      slug?: string;
      tag_list?: string[];
      sort_by_date?: string | null;
      path?: string | null;
      first_published_at?: string | null;
    },
  ) {
    return this.storiesService.updateStoryAdmin(parseInt(spaceId), parseInt(storyId), body);
  }

  @Post('stories/:storyId/publish')
  publishStory(@Param('spaceId') spaceId: string, @Param('storyId') storyId: string) {
    return this.storiesService.publishStory(parseInt(spaceId), parseInt(storyId));
  }

  @Post('stories/:storyId/unpublish')
  unpublishStory(@Param('spaceId') spaceId: string, @Param('storyId') storyId: string) {
    return this.storiesService.unpublishStory(parseInt(spaceId), parseInt(storyId));
  }
}
