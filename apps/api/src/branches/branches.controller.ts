import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { BranchesService } from './branches.service';

@Controller('v1/spaces/:spaceId/branches')
@UseGuards(TokenGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  async getBranches(@Req() req: any) {
    return this.branchesService.findAll(req.space.id);
  }

  @Get(':id')
  async getBranch(@Req() req: any, @Param('id') id: string) {
    const result = await this.branchesService.findOne(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }
}
