import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { WorkflowsService } from './workflows.service';

@Controller('v1/admin/spaces/:spaceId/workflows')
@UseGuards(SessionGuard)
export class WorkflowsAdminController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  // ─── Workflows ─────────────────────────────────────────────────────────────

  @Get()
  list(@Param('spaceId') spaceId: string) {
    return this.workflowsService.adminList(parseInt(spaceId));
  }

  @Get(':id')
  async get(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    const result = await this.workflowsService.adminGetWorkflow(parseInt(spaceId), parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post()
  create(
    @Param('spaceId') spaceId: string,
    @Body() body: { name: string; contentTypes?: string[]; isDefault?: boolean },
  ) {
    return this.workflowsService.adminCreate(parseInt(spaceId), body);
  }

  @Patch(':id')
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; contentTypes?: string[]; isDefault?: boolean },
  ) {
    const result = await this.workflowsService.adminUpdate(parseInt(spaceId), parseInt(id), body);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return this.workflowsService.adminDelete(parseInt(spaceId), parseInt(id));
  }

  // ─── Stages ────────────────────────────────────────────────────────────────

  @Post(':workflowId/stages')
  createStage(
    @Param('spaceId') spaceId: string,
    @Param('workflowId') workflowId: string,
    @Body() body: any,
  ) {
    return this.workflowsService.adminCreateStage(parseInt(spaceId), parseInt(workflowId), body);
  }

  @Patch(':workflowId/stages/:stageId')
  async updateStage(
    @Param('spaceId') spaceId: string,
    @Param('stageId') stageId: string,
    @Body() body: any,
  ) {
    const result = await this.workflowsService.adminUpdateStage(parseInt(spaceId), parseInt(stageId), body);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':workflowId/stages/:stageId')
  deleteStage(@Param('spaceId') spaceId: string, @Param('stageId') stageId: string) {
    return this.workflowsService.adminDeleteStage(parseInt(spaceId), parseInt(stageId));
  }
}
