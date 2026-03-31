import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { TagsService } from './tags.service';

@Controller('v1/spaces/:spaceId/tags')
@UseGuards(SessionOrTokenGuard)
export class TagsMAPIController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('sort_by') sortBy?: string,
    @Query('all_tags') allTags?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    return this.tagsService.listMapi(req.space.id, {
      search,
      sortBy,
      allTags: allTags !== undefined,
      page: page ? parseInt(page) : 1,
      perPage: perPage ? parseInt(perPage) : 25,
    });
  }

  @Post()
  @HttpCode(201)
  create(@Req() req: any, @Body() body: { tag: { name: string; story_id?: number } }) {
    return this.tagsService.createTag(req.space.id, {
      name: body.tag.name,
      storyId: body.tag.story_id,
    });
  }

  @Put(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { tag: { name: string } },
  ) {
    return this.tagsService.updateTag(parseInt(id), req.space.id, { name: body.tag.name });
  }

  @Delete(':tagName')
  @HttpCode(204)
  remove(@Req() req: any, @Param('tagName') tagName: string) {
    return this.tagsService.deleteTagByName(tagName, req.space.id);
  }
}
