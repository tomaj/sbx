import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req } from '@nestjs/common';
import { Auth } from '../auth/auth.decorator';
import { StoriesService } from './stories.service';
import { StoryVersionsService } from './story-versions.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { PartialUpdateStoryDto } from './dto/partial-update-story.dto';
import { QueryParserUtil } from '../shared/query-parser.util';
import { ResultGuard } from '../shared/result-guard.util';

@Controller('v1/spaces/:spaceId/stories')
@Auth('session-or-token')
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
      return QueryParserUtil.parseSortBy(sortBy, 'position', 'asc');
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
    @Query('in_current_folder') inCurrentFolder?: string,
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

    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(page, perPage);
    const { stories, total } = await this.storiesService.listStoriesAdmin(parseInt(spaceId), {
      page: parsedPage,
      perPage: parsedPerPage,
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
      byUuids: QueryParserUtil.parseCsvToStrings(byUuidsParam),
      byUuidsOrdered: QueryParserUtil.parseCsvToStrings(byUuidsOrderedParam),
      excludingIds: excludingIdsParam?.trim() ? excludingIdsParam.split(',').map((s) => BigInt(s.trim())).filter(Boolean) : undefined,
      favouriteOf,
      mine: mine === 'true' ? req.adminUser?.sbxUserId : undefined,
      folderOnly: QueryParserUtil.parseBoolean(folderOnly) ?? false,
      storyOnly: QueryParserUtil.parseBoolean(storyOnly) ?? false,
      startsWith,
      inTrash: QueryParserUtil.parseBoolean(inTrash) ?? false,
      withSlug,
      bySlugs: QueryParserUtil.parseCsvToStrings(bySlugsParam),
      excludingSlugs: QueryParserUtil.parseCsvToStrings(excludingSlugsParam),
      inWorkflowStages: QueryParserUtil.parseCsvToInts(inWorkflowStagesParam),
      scheduledAtGt: scheduledAtGt ? new Date(scheduledAtGt) : undefined,
      scheduledAtLt: scheduledAtLt ? new Date(scheduledAtLt) : undefined,
      referenceSearch: referenceSearch ?? referenceSearchBracket ?? undefined,
      withSummary: QueryParserUtil.parseBoolean(withSummary) ?? false,
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

  // Storyblok-compatible breadcrumbs endpoint: /v1/spaces/:spaceId/breadcrumbs?parent_id=:id&currentPage=1
  @Get('breadcrumbs')
  async getBreadcrumbs(@Param('spaceId') spaceId: string, @Query('parent_id') parentId: string) {
    const result = await this.storiesService.getAncestors(parseInt(spaceId), BigInt(parentId));
    return { breadcrumbs: result.ancestors };
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
    return ResultGuard.throwIfNotFound(
      await this.storiesService.getStoryAdmin(parseInt(spaceId), parseInt(id), releaseId),
      'Story not found',
    );
  }

  @Post()
  async createStory(
    @Param('spaceId') spaceId: string,
    @Body() body: CreateStoryDto,
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
    @Body() body: UpdateStoryDto,
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
    @Body() body: PartialUpdateStoryDto,
  ) {
    return this.storiesService.partialUpdateStory(parseInt(spaceId), parseInt(id), body.story ?? {});
  }
}
