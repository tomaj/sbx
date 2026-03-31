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
import { BranchesService } from './branches.service';

@Controller('v1/spaces/:spaceId/branches')
@UseGuards(SessionOrTokenGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  async getBranches(
    @Req() req: any,
    @Query('by_ids') byIds?: string,
    @Query('search') search?: string,
  ) {
    return this.branchesService.findAll(req.space.id, { by_ids: byIds, search });
  }

  @Get(':id')
  async getBranch(@Req() req: any, @Param('id') id: string) {
    const result = await this.branchesService.findOne(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post()
  @HttpCode(201)
  async createBranch(
    @Req() req: any,
    @Body() body: { branch: { name: string; source_id?: number; url?: string; position?: number } },
  ) {
    return this.branchesService.create(req.space.id, {
      name: body.branch.name,
      url: body.branch.url,
      position: body.branch.position,
      source_id: body.branch.source_id,
    });
  }

  @Put(':id')
  async updateBranch(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { branch: { name?: string; url?: string; position?: number; source_id?: number | null } },
  ) {
    const result = await this.branchesService.update(req.space.id, parseInt(id), {
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
  async deleteBranch(@Req() req: any, @Param('id') id: string) {
    const result = await this.branchesService.remove(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
  }
}
