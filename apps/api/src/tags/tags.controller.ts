import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { TagsService } from './tags.service';

@ApiTags('Tags - CDN')
@Controller('v2/cdn/tags')
@Auth('token')
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
