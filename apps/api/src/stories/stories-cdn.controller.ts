import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { StoriesCdnService } from './stories-cdn.service';

@Controller('v2/cdn/stories')
@UseGuards(TokenGuard)
export class StoriesCdnController {
  constructor(private readonly storiesCdnService: StoriesCdnService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('version') version?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('starts_with') startsWith?: string,
    @Query('by_slugs') bySlugs?: string,
    @Query('by_uuids') byUuids?: string,
    @Query('excluding_slugs') excludingSlugs?: string,
    @Query('with_tag') withTag?: string,
    @Query('is_startpage') isStartpage?: string,
    @Query('search_term') searchTerm?: string,
    @Query('sort_by') sortBy?: string,
  ) {
    const resolvedVersion = version === 'draft' ? 'draft' : 'published';

    return this.storiesCdnService.listStories(req.space.id, {
      version: resolvedVersion,
      page: Math.max(1, parseInt(page ?? '1') || 1),
      perPage: Math.min(100, parseInt(perPage ?? '25') || 25),
      startsWith,
      bySlugs: bySlugs ? bySlugs.split(',').filter(Boolean) : undefined,
      byUuids: byUuids ? byUuids.split(',').filter(Boolean) : undefined,
      excludingSlugs: excludingSlugs ? excludingSlugs.split(',').filter(Boolean) : undefined,
      withTag,
      isStartpage: isStartpage !== undefined ? isStartpage !== '0' && isStartpage !== 'false' : undefined,
      searchTerm,
      sortBy,
    });
  }

  @Get('*slug')
  getOne(
    @Req() req: any,
    @Param('slug') slug: string | string[],
    @Query('version') version?: string,
  ) {
    const resolvedVersion = version === 'draft' ? 'draft' : 'published';
    const rawSlug = Array.isArray(slug) ? slug.join('/') : slug;
    const normalizedSlug = rawSlug.replace(/^\//, '');
    return this.storiesCdnService.getStory(req.space.id, normalizedSlug, { version: resolvedVersion });
  }
}
