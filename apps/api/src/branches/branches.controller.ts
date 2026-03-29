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
  async getBranches(@Req() req: any) {
    return this.branchesService.findAll(req.space.id);
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
    @Body() body: { branch: { name: string; source_id?: number; url?: string } },
  ) {
    return this.branchesService.create(req.space.id, {
      name: body.branch.name,
      url: body.branch.url,
    });
  }

  @Put(':id')
  async updateBranch(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { branch: { name?: string; url?: string; position?: number } },
  ) {
    const result = await this.branchesService.update(req.space.id, parseInt(id), {
      name: body.branch.name,
      url: body.branch.url,
    });
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteBranch(@Req() req: any, @Param('id') id: string) {
    const result = await this.branchesService.remove(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return {};
  }
}
