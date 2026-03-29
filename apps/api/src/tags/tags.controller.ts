import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { TagsService } from './tags.service';

@Controller('v2/cdn/tags')
@UseGuards(TokenGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  getTags(
    @Req() req: any,
    @Query('starts_with') startsWith?: string,
    @Query('version') version?: string,
  ) {
    return this.tagsService.findAllCdn(req.space.id, {
      startsWith,
      version: version === 'draft' ? 'draft' : 'published',
    });
  }
}
