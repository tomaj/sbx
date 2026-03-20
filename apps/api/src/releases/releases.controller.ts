import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { ReleasesService } from './releases.service';

@Controller('v1/spaces/:spaceId/releases')
@UseGuards(TokenGuard)
export class ReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Get()
  async getReleases(@Req() req: any) {
    return this.releasesService.findAll(req.space.id);
  }

  @Get(':id')
  async getRelease(@Req() req: any, @Param('id') id: string) {
    const result = await this.releasesService.findOne(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }
}
