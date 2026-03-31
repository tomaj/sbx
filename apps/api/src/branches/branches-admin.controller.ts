import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { BranchesService } from './branches.service';

@Controller('v1/admin/spaces/:spaceId/branches')
@UseGuards(SessionGuard)
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
    const result = await this.branchesService.findOne(parseInt(spaceId), parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
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
    const result = await this.branchesService.update(parseInt(spaceId), parseInt(id), {
      name: body.branch.name,
      url: body.branch.url,
      position: body.branch.position,
      source_id: body.branch.source_id,
    });
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    const result = await this.branchesService.remove(parseInt(spaceId), parseInt(id));
    if (!result) throw new NotFoundException();
  }
}
