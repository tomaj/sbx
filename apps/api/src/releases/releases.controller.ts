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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { ReleasesService } from './releases.service';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Releases - MAPI')
@Controller('v1/spaces/:spaceId/releases')
@Auth('session-or-token')
export class ReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Get()
  async getReleases(@Req() req: any, @Query('branch_id') branchId?: string) {
    return this.releasesService.findAll(req.space.id, branchId ? parseInt(branchId) : undefined);
  }

  @Get(':id')
  async getRelease(@Req() req: any, @Param('id') id: string) {
    return ResultGuard.throwIfNotFound(await this.releasesService.findOne(req.space.id, parseInt(id)));
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
    ResultGuard.throwIfNotFound(await this.releasesService.findOne(req.space.id, parseInt(id)));
    return this.releasesService.conflictCheck(req.space.id, parseInt(id));
  }

  @Put(':id')
  async updateRelease(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { release: { name?: string; release_at?: string | null; timezone?: string; branches_to_deploy?: number[] }; do_release?: boolean },
  ) {
    return ResultGuard.throwIfNotFound(
      await this.releasesService.update(req.space.id, parseInt(id), {
        ...body.release,
        do_release: body.do_release,
      }),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteRelease(@Req() req: any, @Param('id') id: string) {
    return this.releasesService.remove(req.space.id, parseInt(id));
  }
}
