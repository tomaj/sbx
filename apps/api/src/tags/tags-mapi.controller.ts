import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
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
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { TagsService } from './tags.service';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Tags - MAPI')
@Controller('v1/spaces/:spaceId/tags')
@Auth('session-or-token')
export class TagsMAPIController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('sort_by') sortBy?: string,
    @Query('all_tags') allTags?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(
      page,
      perPage,
    );
    return this.tagsService.listMapi(req.space.id, {
      search,
      sortBy,
      allTags: allTags !== undefined,
      page: parsedPage,
      perPage: parsedPerPage,
    });
  }

  @Post()
  @HttpCode(201)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { tag: { name: string; story_id?: number } },
  ) {
    return this.tagsService.createTag(req.space.id, {
      name: body.tag.name,
      storyId: body.tag.story_id,
    });
  }

  @Put(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { tag: { name: string } },
  ) {
    return this.tagsService.updateTag(id, req.space.id, { name: body.tag.name });
  }

  @Delete(':tagName')
  @HttpCode(200)
  remove(@Req() req: AuthenticatedRequest, @Param('tagName') tagName: string) {
    return this.tagsService.deleteTagByName(tagName, req.space.id);
  }
}
