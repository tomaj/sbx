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
  ) {
    return this.tagsService.listMapi(req.space.id, { search, sortBy });
  }

  @Post()
  @HttpCode(201)
  create(@Req() req: any, @Body() body: { tag: { name: string } }) {
    return this.tagsService.createTag(req.space.id, { name: body.tag.name });
  }

  @Put(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { tag: { name: string } },
  ) {
    return this.tagsService.updateTag(parseInt(id), req.space.id, { name: body.tag.name });
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.tagsService.deleteTag(parseInt(id), req.space.id);
  }
}
