import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
}
