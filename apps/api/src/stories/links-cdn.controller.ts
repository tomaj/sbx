import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { LinksCdnService } from './links-cdn.service';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Links - CDN')
@Controller('v2/cdn/links')
@Auth('token')
export class LinksCdnController {
  constructor(private readonly linksCdnService: LinksCdnService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('version') version?: string,
    @Query('starts_with') startsWith?: string,
    @Query('with_parent') withParent?: string,
    @Query('include_dates') includeDates?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(page, perPage);
    return this.linksCdnService.listLinks(req.space.id, {
      version: version === 'draft' ? 'draft' : 'published',
      startsWith,
      withParent: withParent !== undefined ? parseInt(withParent) : undefined,
      includeDates: includeDates === '1',
      page: parsedPage,
      perPage: Math.min(1000, parsedPerPage),
    });
  }

  @Get(':uuid')
  getOne(
    @Req() req: any,
    @Param('uuid') uuid: string,
    @Query('include_dates') _includeDates?: string,
  ) {
    return this.linksCdnService.getLink(req.space.id, uuid);
  }
}
