import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { BranchesService } from './branches.service';

@Controller('v1/admin/spaces/:spaceId/branches')
@UseGuards(SessionGuard)
export class BranchesAdminController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  list(@Param('spaceId') spaceId: string) {
    return this.branchesService.findAll(parseInt(spaceId));
  }

  @Post()
  create(
    @Param('spaceId') spaceId: string,
    @Body() body: { name: string; url?: string },
  ) {
    return this.branchesService.create(parseInt(spaceId), body);
  }

  @Patch(':id')
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; url?: string | null },
  ) {
    const result = await this.branchesService.update(parseInt(spaceId), parseInt(id), body);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  async remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    const result = await this.branchesService.remove(parseInt(spaceId), parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }
}
