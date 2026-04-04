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
} from '@nestjs/common';
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
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('by_object_type') byObjectType?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listTags(spaceId, byObjectType, search);
  }

  @Post('internal_tags')
  create(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Body() body: { internal_tag: { name: string; object_type?: string } },
  ) {
    return this.service.createTag(spaceId, body.internal_tag.name, body.internal_tag.object_type);
  }

  @Put('internal_tags/:id')
  update(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { internal_tag: { name?: string; object_type?: string } },
  ) {
    return this.service.updateTag(spaceId, id, body.internal_tag);
  }

  @Delete('internal_tags/:id')
  @HttpCode(200)
  async delete(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.service.deleteTag(spaceId, id);
    return {};
  }
}
