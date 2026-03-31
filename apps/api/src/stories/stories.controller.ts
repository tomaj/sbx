import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { StoriesService } from './stories.service';
import { StoryVersionsService } from './story-versions.service';

@Controller('v1/spaces/:spaceId/stories')
@UseGuards(SessionOrTokenGuard)
export class StoriesController {
  constructor(
    private readonly storiesService: StoriesService,
    private readonly storyVersionsService: StoryVersionsService,
  ) {}

  /**
   * Parse Storyblok-style sort_by param: "field:direction" (e.g. "name:asc", "created_at:desc").
   * Also supports legacy sort_field/sort_dir params for backward compatibility.
   */
  private parseSortBy(sortBy?: string, sortField?: string, sortDir?: string, sortOrder?: string): { field: string; dir: 'asc' | 'desc' } {
    if (sortBy) {
      const lastColon = sortBy.lastIndexOf(':');
      if (lastColon > 0) {
        const field = sortBy.slice(0, lastColon);
        const dir = sortBy.slice(lastColon + 1);
        if (dir === 'asc' || dir === 'desc') {
          return { field, dir };
        }
      }
      // sort_by without direction defaults to asc
      return { field: sortBy, dir: 'asc' };
    }
    // Legacy params
    return {
      field: sortField ?? 'position',
      dir: (sortDir ?? sortOrder) === 'desc' ? 'desc' : 'asc',
    };
  }

  @Get()
  async list(
    @Req() req: any,
    @Param('spaceId') spaceId: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('search') search?: string,
    @Query('text_search') textSearch?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
    @Query('sort_field') sortField?: string,
    @Query('sort_dir') sortDir?: string,
    @Query('with_tag') tag?: string,
    @Query('content_type') contentType?: string,
    @Query('contain_component') containComponent?: string,
    @Query('with_parent') withParent?: string,
    @Query('parent_id') parentIdParam?: string,
    @Query('published') published?: string,
    @Query('is_published') isPublished?: string,
    @Query('uuid') uuid?: string,
    @Query('in_release') inRelease?: string,
    @Query('by_ids') byIdsParam?: string,
    @Query('by_uuids') byUuidsParam?: string,
    @Query('by_uuids_ordered') byUuidsOrderedParam?: string,
    @Query('excluding_ids') excludingIdsParam?: string,
    @Query('favourite') favourite?: string,
    @Query('favourite_of') favouriteOfParam?: string,
    @Query('mine') mine?: string,
    @Query('folder_only') folderOnly?: string,
    @Query('story_only') storyOnly?: string,
    @Query('starts_with') startsWith?: string,
    @Query('in_trash') inTrash?: string,
    @Query('with_slug') withSlug?: string,
    @Query('by_slugs') bySlugsParam?: string,
    @Query('excluding_slugs') excludingSlugsParam?: string,
    @Query('in_workflow_stages') inWorkflowStagesParam?: string,
    @Query('scheduled_at_gt') scheduledAtGt?: string,
    @Query('scheduled_at_lt') scheduledAtLt?: string,
    @Query('reference_search') referenceSearch?: string | string[],
    @Query('reference_search[]') referenceSearchBracket?: string | string[],
    @Query('with_summary') withSummary?: string,
  ) {
    let parentId: bigint | null | undefined = undefined;
    const rawParent = parentIdParam !== undefined ? parentIdParam : withParent;
    if (rawParent !== undefined) {
      if (rawParent === '') {
        parentId = null;
      } else {
        const parentNum = parseInt(rawParent, 10);
        parentId = parentNum === 0 ? null : BigInt(parentNum);
      }
    }

    const resolvedPublished =
      (isPublished ?? published) === 'true' ? true
      : (isPublished ?? published) === 'false' ? false
      : undefined;

    const { field: resolvedSortField, dir: resolvedSortDir } = this.parseSortBy(sortBy, sortField, sortDir, sortOrder);

    // Resolve favourite_of: either from explicit param or from `favourite=true` using current user
    let favouriteOf: number | undefined = favouriteOfParam ? parseInt(favouriteOfParam) : undefined;
    if (favourite === 'true' && !favouriteOf && req.adminUser?.sbxUserId) {
      favouriteOf = req.adminUser.sbxUserId;
    }

    const { stories, total } = await this.storiesService.listStoriesAdmin(parseInt(spaceId), {
      page: Math.max(1, parseInt(page) || 1),
      perPage: Math.min(100, parseInt(perPage) || 25),
      search: textSearch ?? search,
      sortField: resolvedSortField,
      sortDir: resolvedSortDir,
      parentId,
      contentType,
      tag,
      block: containComponent,
      published: resolvedPublished,
      uuid,
      inRelease: inRelease ? parseInt(inRelease) : undefined,
      byIds: byIdsParam?.trim() ? byIdsParam.split(',').map((s) => BigInt(s.trim())).filter(Boolean) : undefined,
      byUuids: byUuidsParam?.trim() ? byUuidsParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      byUuidsOrdered: byUuidsOrderedParam?.trim() ? byUuidsOrderedParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      excludingIds: excludingIdsParam?.trim() ? excludingIdsParam.split(',').map((s) => BigInt(s.trim())).filter(Boolean) : undefined,
      favouriteOf,
      mine: mine === 'true' ? req.adminUser?.sbxUserId : undefined,
      folderOnly: folderOnly === 'true' || folderOnly === '1',
      storyOnly: storyOnly === 'true' || storyOnly === '1',
      startsWith,
      inTrash: inTrash === 'true' || inTrash === '1',
      withSlug,
      bySlugs: bySlugsParam?.trim() ? bySlugsParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      excludingSlugs: excludingSlugsParam?.trim() ? excludingSlugsParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      inWorkflowStages: inWorkflowStagesParam?.trim() ? inWorkflowStagesParam.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)) : undefined,
      scheduledAtGt: scheduledAtGt ? new Date(scheduledAtGt) : undefined,
      scheduledAtLt: scheduledAtLt ? new Date(scheduledAtLt) : undefined,
      referenceSearch: referenceSearch ?? referenceSearchBracket ?? undefined,
      withSummary: withSummary === 'true' || withSummary === '1',
    });

    return { stories, total };
  }

  @Get('filter-options')
  getFilterOptions(@Param('spaceId') spaceId: string) {
    return this.storiesService.getFilterOptions(parseInt(spaceId));
  }

  @Get('ancestors')
  getAncestors(@Param('spaceId') spaceId: string, @Query('story_id') storyId: string) {
    return this.storiesService.getAncestors(parseInt(spaceId), BigInt(storyId));
  }

  @Get(':id/compare')
  compareStory(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Query('version_v2') versionV2: string,
  ) {
    return this.storyVersionsService.compareVersions(parseInt(spaceId), parseInt(id), parseInt(versionV2));
  }

  /**
   * Storyblok MAPI uses GET for publish/unpublish (not POST/PUT).
   * Must be declared BEFORE @Get(':id') to avoid NestJS matching "publish" as :id.
   * We also keep POST as an alias for backward compatibility with admin UI.
   */
  @Get(':id/publish')
  publishStoryGet(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Query('lang') lang?: string,
    @Req() req?: any,
  ) {
    return this.storiesService.publishStory(parseInt(spaceId), parseInt(id), req?.adminUser?.sbxUserId, lang);
  }

  @Get(':id/unpublish')
  unpublishStoryGet(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Query('lang') lang?: string,
    @Req() req?: any,
  ) {
    return this.storiesService.unpublishStory(parseInt(spaceId), parseInt(id), req?.adminUser?.sbxUserId);
  }

  @Get(':id')
  async getStory(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Query('release_id') releaseIdParam?: string,
  ) {
    const releaseId = releaseIdParam ? parseInt(releaseIdParam) : undefined;
    const result = await this.storiesService.getStoryAdmin(parseInt(spaceId), parseInt(id), releaseId);
    if (!result) throw new NotFoundException('Story not found');
    return result;
  }

  @Post()
  async createStory(
    @Param('spaceId') spaceId: string,
    @Body() body: {
      story: { name: string; slug: string; content?: Record<string, any>; parent_id?: number | null; tag_list?: string[]; path?: string | null; is_folder?: boolean; is_startpage?: boolean; first_published_at?: string | null; publish_at?: string | null; expire_at?: string | null };
      publish?: boolean;
      release_id?: number;
    },
    @Req() req: any,
  ) {
    const result = await this.storiesService.createStory(parseInt(spaceId), body.story, req.adminUser?.sbxUserId, body.release_id);

    if (body.publish) {
      const storyId = (result.story as any).id;
      return this.storiesService.publishStory(parseInt(spaceId), storyId);
    }

    return result;
  }

  @Put(':id')
  async updateStory(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: {
      story: { name?: string; slug?: string; content?: Record<string, any>; tag_list?: string[]; path?: string | null; sort_by_date?: string | null; first_published_at?: string | null; publish_at?: string | null; expire_at?: string | null; is_startpage?: boolean; disable_fe_editor?: boolean };
      publish?: boolean;
      force_update?: string;
      release_id?: number;
      group_id?: string;
      lang?: string;
    },
    @Req() req: any,
  ) {
    // Merge release_id from body root into data for the service
    const storyData = {
      ...body.story,
      ...(body.release_id != null && { release_id: body.release_id }),
    };
    const result = await this.storiesService.updateStoryAdmin(parseInt(spaceId), parseInt(id), storyData, req.adminUser?.sbxUserId);

    if (body.publish) {
      return this.storiesService.publishStory(parseInt(spaceId), parseInt(id));
    }

    return result;
  }

  @Delete(':id')
  @HttpCode(200)
  deleteStory(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return this.storiesService.deleteStory(parseInt(spaceId), parseInt(id));
  }

  @Post(':id/publish')
  publishStoryPost(@Param('spaceId') spaceId: string, @Param('id') id: string, @Req() req: any) {
    return this.storiesService.publishStory(parseInt(spaceId), parseInt(id), req.adminUser?.sbxUserId);
  }

  @Post(':id/unpublish')
  unpublishStoryPost(@Param('spaceId') spaceId: string, @Param('id') id: string, @Req() req: any) {
    return this.storiesService.unpublishStory(parseInt(spaceId), parseInt(id), req.adminUser?.sbxUserId);
  }

  @Post(':id/partial_update')
  @HttpCode(200)
  partialUpdate(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: { story: { favourite_for_user_ids?: number[] } },
  ) {
    return this.storiesService.partialUpdateStory(parseInt(spaceId), parseInt(id), body.story ?? {});
  }
}
