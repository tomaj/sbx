import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { TagsService } from './tags.service';

@Controller('v1/admin/spaces/:spaceId/tags')
@UseGuards(SessionGuard)
export class TagsAdminController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  list(
    @Param('spaceId') spaceId: string,
    @Query('search') search?: string,
    @Query('sort_field') sortField?: string,
    @Query('sort_dir') sortDir?: string,
  ) {
    return this.tagsService.listAdmin(parseInt(spaceId), { search, sortField, sortDir });
  }

  @Post()
  create(
    @Param('spaceId') spaceId: string,
    @Body() body: { name: string },
  ) {
    return this.tagsService.createTag(parseInt(spaceId), body);
  }

  @Patch(':id')
  update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.tagsService.updateTag(parseInt(id), parseInt(spaceId), body);
  }
}
