import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { BranchesService } from './branches.service';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Branches - Admin')
@Controller('v1/admin/spaces/:spaceId/branches')
@Auth('session')
export class BranchesAdminController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  list(
    @Param('spaceId') spaceId: string,
    @Query('by_ids') byIds?: string,
    @Query('search') search?: string,
  ) {
    return this.branchesService.findAll(parseInt(spaceId), { by_ids: byIds, search });
  }

  @Get(':id')
  async findOne(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return ResultGuard.throwIfNotFound(await this.branchesService.findOne(parseInt(spaceId), parseInt(id)));
  }

  @Post()
  create(
    @Param('spaceId') spaceId: string,
    @Body() body: { branch: { name: string; url?: string; position?: number; source_id?: number } },
  ) {
    return this.branchesService.create(parseInt(spaceId), {
      name: body.branch.name,
      url: body.branch.url,
      position: body.branch.position,
      source_id: body.branch.source_id,
    });
  }

  @Put(':id')
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: { branch: { name?: string; url?: string | null; position?: number; source_id?: number | null } },
  ) {
    return ResultGuard.throwIfNotFound(
      await this.branchesService.update(parseInt(spaceId), parseInt(id), {
        name: body.branch.name,
        url: body.branch.url,
        position: body.branch.position,
        source_id: body.branch.source_id,
      }),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    ResultGuard.throwIfNotFound(await this.branchesService.remove(parseInt(spaceId), parseInt(id)));
  }
}
