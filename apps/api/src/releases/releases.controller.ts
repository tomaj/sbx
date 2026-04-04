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
import { ReleasesService } from './releases.service';
import { ResultGuard } from '../shared/result-guard.util';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Releases - MAPI')
@Controller('v1/spaces/:spaceId/releases')
@Auth('session-or-token')
export class ReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Get()
  async getReleases(@Req() req: AuthenticatedRequest, @Query('branch_id') branchId?: string) {
    return this.releasesService.findAll(req.space.id, QueryParserUtil.parseOptionalInt(branchId));
  }

  @Get(':id')
  async getRelease(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(await this.releasesService.findOne(req.space.id, id));
  }

  @Post()
  @HttpCode(201)
  async createRelease(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      release: {
        name: string;
        release_at?: string | null;
        timezone?: string;
        branches_to_deploy?: number[];
      };
    },
  ) {
    return this.releasesService.create(req.space.id, body.release);
  }

  @Get(':id/conflict_check')
  async conflictCheck(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    ResultGuard.throwIfNotFound(await this.releasesService.findOne(req.space.id, id));
    return this.releasesService.conflictCheck(req.space.id, id);
  }

  @Put(':id')
  async updateRelease(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      release: {
        name?: string;
        release_at?: string | null;
        timezone?: string;
        branches_to_deploy?: number[];
      };
      do_release?: boolean;
    },
  ) {
    return ResultGuard.throwIfNotFound(
      await this.releasesService.update(req.space.id, id, {
        ...body.release,
        do_release: body.do_release,
      }),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteRelease(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.releasesService.remove(req.space.id, id);
  }
}
