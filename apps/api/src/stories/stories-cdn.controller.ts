import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { StoriesCdnService } from './stories-cdn.service';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Stories - CDN')
@Controller('v2/cdn/stories')
@Auth('token')
export class StoriesCdnController {
  constructor(private readonly storiesCdnService: StoriesCdnService) {}

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Query('version') version?: string,
    @Query('from_release') fromRelease?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('starts_with') startsWith?: string,
    @Query('by_slugs') bySlugs?: string,
    @Query('by_uuids') byUuids?: string,
    @Query('by_uuids_ordered') byUuidsOrdered?: string,
    @Query('excluding_slugs') excludingSlugs?: string,
    @Query('excluding_ids') excludingIds?: string,
    @Query('content_type') contentType?: string,
    @Query('level') level?: string,
    @Query('with_tag') withTag?: string,
    @Query('is_startpage') isStartpage?: string,
    @Query('search_term') searchTerm?: string,
    @Query('sort_by') sortBy?: string,
    @Query('first_published_at_gt') firstPublishedAtGt?: string,
    @Query('first_published_at_lt') firstPublishedAtLt?: string,
    @Query('published_at_gt') publishedAtGt?: string,
    @Query('published_at_lt') publishedAtLt?: string,
    @Query('updated_at_gt') updatedAtGt?: string,
    @Query('updated_at_lt') updatedAtLt?: string,
    @Query('excluding_fields') excludingFields?: string,
  ) {
    const resolvedVersion = version === 'draft' ? 'draft' : 'published';

    // NestJS/Express does not parse bracket notation in query strings by default,
    // so filter_query[field][op]=value arrives as flat keys. Parse them manually.
    const filterQuery = this.parseFilterQuery(req.query);

    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(
      page,
      perPage,
    );
    return this.storiesCdnService.listStories(req.space.id, {
      version: resolvedVersion,
      fromRelease: QueryParserUtil.parseOptionalInt(fromRelease),
      page: parsedPage,
      perPage: parsedPerPage,
      startsWith,
      bySlugs: QueryParserUtil.parseCsvToStrings(bySlugs),
      byUuids: QueryParserUtil.parseCsvToStrings(byUuids),
      byUuidsOrdered: QueryParserUtil.parseCsvToStrings(byUuidsOrdered),
      excludingSlugs: QueryParserUtil.parseCsvToStrings(excludingSlugs),
      excludingIds: QueryParserUtil.parseCsvToInts(excludingIds),
      contentType,
      level: QueryParserUtil.parseOptionalInt(level),
      withTag,
      isStartpage:
        isStartpage !== undefined ? isStartpage !== '0' && isStartpage !== 'false' : undefined,
      searchTerm,
      sortBy,
      filterQuery,
      firstPublishedAtGt,
      firstPublishedAtLt,
      publishedAtGt,
      publishedAtLt,
      updatedAtGt,
      updatedAtLt,
      excludingFields: QueryParserUtil.parseCsvToStrings(excludingFields),
    });
  }

  // Parses filter_query[field][op]=value bracket notation from flat req.query keys
  private parseFilterQuery(query: Record<string, any>): Record<string, any> | undefined {
    const result: Record<string, any> = {};
    let found = false;
    for (const [key, val] of Object.entries(query)) {
      const m = key.match(/^filter_query\[([^\]]+)\]\[([^\]]+)\]$/);
      if (m) {
        const [, field, op] = m;
        if (!result[field]) result[field] = {};
        result[field][op] = val;
        found = true;
      }
    }
    return found ? result : undefined;
  }

  @Get('*slug')
  getOne(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string | string[],
    @Query('version') version?: string,
    @Query('find_by') findBy?: string,
    @Query('from_release') fromRelease?: string,
  ) {
    const resolvedVersion = version === 'draft' ? 'draft' : 'published';
    const rawSlug = Array.isArray(slug) ? slug.join('/') : slug;
    const normalizedSlug = rawSlug.replace(/^\//, '');
    return this.storiesCdnService.getStory(req.space.id, normalizedSlug, {
      version: resolvedVersion,
      findBy,
      fromRelease: QueryParserUtil.parseOptionalInt(fromRelease),
    });
  }
}
