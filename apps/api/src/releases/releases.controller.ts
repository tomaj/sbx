import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { ReleasesService } from './releases.service';

@Controller('v1/spaces/:spaceId/releases')
@UseGuards(SessionOrTokenGuard)
export class ReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Get()
  async getReleases(@Req() req: any, @Query('branch_id') branchId?: string) {
    return this.releasesService.findAll(req.space.id, branchId ? parseInt(branchId) : undefined);
  }

  @Get(':id')
  async getRelease(@Req() req: any, @Param('id') id: string) {
    const result = await this.releasesService.findOne(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post()
  @HttpCode(201)
  async createRelease(
    @Req() req: any,
    @Body() body: { release: { name: string; release_at?: string | null; timezone?: string; branches_to_deploy?: number[] } },
  ) {
    return this.releasesService.create(req.space.id, body.release);
  }

  @Get(':id/conflict_check')
  async conflictCheck(@Req() req: any, @Param('id') id: string) {
    const release = await this.releasesService.findOne(req.space.id, parseInt(id));
    if (!release) throw new NotFoundException();
    return this.releasesService.conflictCheck(req.space.id, parseInt(id));
  }

  @Put(':id')
  async updateRelease(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { release: { name?: string; release_at?: string | null; timezone?: string; branches_to_deploy?: number[] }; do_release?: boolean },
  ) {
    const result = await this.releasesService.update(req.space.id, parseInt(id), {
      ...body.release,
      do_release: body.do_release,
    });
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteRelease(@Req() req: any, @Param('id') id: string) {
    return this.releasesService.remove(req.space.id, parseInt(id));
  }
}
