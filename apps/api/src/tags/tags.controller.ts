import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { TagsService } from './tags.service';

@Controller('v2/cdn/tags')
@UseGuards(TokenGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  getTags(@Req() req: any) {
    return this.tagsService.findAll(req.space.id);
  }
}
