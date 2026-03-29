import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { LinksCdnService } from './links-cdn.service';

@Controller('v2/cdn/links')
@UseGuards(TokenGuard)
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
    return this.linksCdnService.listLinks(req.space.id, {
      version: version === 'draft' ? 'draft' : 'published',
      startsWith,
      withParent: withParent !== undefined ? parseInt(withParent) : undefined,
      includeDates: includeDates === '1',
      page: Math.max(1, parseInt(page ?? '1') || 1),
      perPage: Math.min(1000, parseInt(perPage ?? '25') || 25),
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
