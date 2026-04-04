import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { InternalTagsService } from './internal-tags.service';

@ApiTags('Internal Tags - MAPI')
@Controller('v1/spaces/:spaceId')
@Auth('session-or-token')
export class InternalTagsController {
  constructor(private readonly service: InternalTagsService) {}

  @Get('internal_tags')
  list(
    @Param('spaceId') spaceId: string,
    @Query('by_object_type') byObjectType?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listTags(parseInt(spaceId), byObjectType, search);
  }

  @Post('internal_tags')
  create(
    @Param('spaceId') spaceId: string,
    @Body() body: { internal_tag: { name: string; object_type?: string } },
  ) {
    return this.service.createTag(parseInt(spaceId), body.internal_tag.name, body.internal_tag.object_type);
  }

  @Put('internal_tags/:id')
  update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: { internal_tag: { name?: string; object_type?: string } },
  ) {
    return this.service.updateTag(parseInt(spaceId), parseInt(id), body.internal_tag);
  }

  @Delete('internal_tags/:id')
  @HttpCode(200)
  async delete(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    await this.service.deleteTag(parseInt(spaceId), parseInt(id));
    return {};
  }
}
