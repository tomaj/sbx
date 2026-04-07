import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Auth } from '../auth/auth.decorator';
import { StoriesService } from './stories.service';
import { StoriesQueryService } from './stories-query.service';
import { StoryVersionsService } from './story-versions.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { PartialUpdateStoryDto } from './dto/partial-update-story.dto';
import { QueryParserUtil } from '../shared/query-parser.util';
import { ResultGuard } from '../shared/result-guard.util';
import { MaintenanceModeGuard } from '../shared/maintenance-mode.guard';

@Controller('v1/spaces/:spaceId/stories')
@Auth('session-or-token')
@UseGuards(MaintenanceModeGuard)
export class StoriesController {
  constructor(
    private readonly storiesService: StoriesService,
    private readonly storiesQueryService: StoriesQueryService,
    private readonly storyVersionsService: StoryVersionsService,
  ) {}

  /**
   * Parse Storyblok-style sort_by param: "field:direction" (e.g. "name:asc", "created_at:desc").
   * Also supports legacy sort_field/sort_dir params for backward compatibility.
   */
  private parseSortBy(
    sortBy?: string,
    sortField?: string,
    sortDir?: string,
    sortOrder?: string,
  ): { field: string; dir: 'asc' | 'desc' } {
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
    @Req() req: AuthenticatedRequest,
    @Param('spaceId', ParseIntPipe) spaceId: number,
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
    @Query('in_current_folder') _inCurrentFolder?: string,
  ) {
    let parentId: bigint | null | undefined;
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
      (isPublished ?? published) === 'true'
        ? true
        : (isPublished ?? published) === 'false'
          ? false
          : undefined;

    const { field: resolvedSortField, dir: resolvedSortDir } = this.parseSortBy(
      sortBy,
      sortField,
      sortDir,
      sortOrder,
    );

    // Resolve favourite_of: either from explicit param or from `favourite=true` using current user
    let favouriteOf: number | undefined = QueryParserUtil.parseOptionalInt(favouriteOfParam);
    if (favourite === 'true' && !favouriteOf && req.adminUser?.sbxUserId) {
      favouriteOf = req.adminUser.sbxUserId;
    }

    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(
      page,
      perPage,
    );
    const { stories, total } = await this.storiesQueryService.listStoriesAdmin(spaceId, {
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
      inRelease: QueryParserUtil.parseOptionalInt(inRelease),
      byIds: QueryParserUtil.parseCsvToBigInts(byIdsParam),
      byUuids: QueryParserUtil.parseCsvToStrings(byUuidsParam),
      byUuidsOrdered: QueryParserUtil.parseCsvToStrings(byUuidsOrderedParam),
      excludingIds: QueryParserUtil.parseCsvToBigInts(excludingIdsParam),
      favouriteOf,
      mine: mine === 'true' ? (req.adminUser?.sbxUserId ?? undefined) : undefined,
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
  getFilterOptions(@Param('spaceId', ParseIntPipe) spaceId: number) {
    return this.storiesQueryService.getFilterOptions(spaceId);
  }

  @Get('ancestors')
  getAncestors(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('story_id') storyId: string,
  ) {
    return this.storiesQueryService.getAncestors(spaceId, BigInt(storyId));
  }

  // Storyblok-compatible breadcrumbs endpoint: /v1/spaces/:spaceId/breadcrumbs?parent_id=:id&currentPage=1
  @Get('breadcrumbs')
  async getBreadcrumbs(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('parent_id') parentId: string,
  ) {
    const result = await this.storiesQueryService.getAncestors(spaceId, BigInt(parentId));
    return { breadcrumbs: result.ancestors };
  }

  @Get(':id/compare')
  compareStory(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('version_v2') versionV2: string,
  ) {
    return this.storyVersionsService.compareVersions(
      spaceId,
      id,
      QueryParserUtil.parseOptionalInt(versionV2) ?? 0,
    );
  }

  /**
   * Storyblok MAPI uses GET for publish/unpublish (not POST/PUT).
   * Must be declared BEFORE @Get(':id') to avoid NestJS matching "publish" as :id.
   * We also keep POST as an alias for backward compatibility with admin UI.
   */
  @Get(':id/publish')
  publishStoryGet(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('lang') lang?: string,
    @Req() req?: any,
  ) {
    return this.storiesService.publishStory(spaceId, id, req?.adminUser?.sbxUserId, lang);
  }

  @Get(':id/unpublish')
  unpublishStoryGet(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('lang') _lang?: string,
    @Req() req?: any,
  ) {
    return this.storiesService.unpublishStory(spaceId, id, req?.adminUser?.sbxUserId);
  }

  @Get(':id')
  async getStory(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('release_id') releaseIdParam?: string,
  ) {
    const releaseId = QueryParserUtil.parseOptionalInt(releaseIdParam);
    return ResultGuard.throwIfNotFound(
      await this.storiesQueryService.getStoryAdmin(spaceId, id, releaseId),
      'Story not found',
    );
  }

  @Post()
  @HttpCode(201)
  async createStory(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Body() body: CreateStoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.storiesService.createStory(
      spaceId,
      body.story,
      req.adminUser?.sbxUserId,
      body.release_id,
    );

    if (body.publish) {
      const storyId = (result.story as any).id;
      return this.storiesService.publishStory(spaceId, storyId);
    }

    return result;
  }

  @Put(':id')
  async updateStory(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateStoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Merge release_id from body root into data for the service
    const storyData = {
      ...body.story,
      ...(body.release_id != null && { release_id: body.release_id }),
    };
    const result = await this.storiesService.updateStoryAdmin(
      spaceId,
      id,
      storyData,
      req.adminUser?.sbxUserId,
    );

    if (body.publish) {
      return this.storiesService.publishStory(spaceId, id);
    }

    return result;
  }

  @Delete(':id')
  @HttpCode(200)
  deleteStory(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.storiesService.deleteStory(spaceId, id);
  }

  @Post(':id/publish')
  publishStoryPost(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.storiesService.publishStory(spaceId, id, req.adminUser?.sbxUserId);
  }

  @Post(':id/unpublish')
  unpublishStoryPost(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.storiesService.unpublishStory(spaceId, id, req.adminUser?.sbxUserId);
  }

  @Post(':id/partial_update')
  @HttpCode(200)
  partialUpdate(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PartialUpdateStoryDto,
  ) {
    return this.storiesService.partialUpdateStory(spaceId, id, body.story ?? {});
  }
}
