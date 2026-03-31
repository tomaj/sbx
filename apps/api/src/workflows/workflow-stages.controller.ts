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
import { WorkflowsService } from './workflows.service';

@Controller('v1/spaces/:spaceId/workflow_stages')
@UseGuards(SessionOrTokenGuard)
export class WorkflowStagesController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('exclude_id') excludeId?: string,
    @Query('by_ids') byIds?: string,
    @Query('search') search?: string,
    @Query('in_workflow') inWorkflow?: string,
  ) {
    return this.workflowsService.listStages(req.space.id, {
      excludeId: excludeId ? parseInt(excludeId) : undefined,
      byIds: byIds ? byIds.split(',').map(Number) : undefined,
      search,
      inWorkflow: inWorkflow ? parseInt(inWorkflow) : undefined,
    });
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const result = await this.workflowsService.getStage(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post()
  @HttpCode(201)
  async create(
    @Req() req: any,
    @Body()
    body: {
      workflow_stage: {
        name: string;
        workflow_id?: number;
        color?: string;
        position?: number;
        is_default?: boolean;
        allow_publish?: boolean;
        allow_admin_publish?: boolean;
        allow_all_users?: boolean;
        allow_admin_change?: boolean;
        allow_editor_change?: boolean;
        allow_all_stages?: boolean;
        user_ids?: number[];
        space_role_ids?: number[];
        workflow_stage_ids?: number[];
        story_editing_locked?: boolean;
        auto_remove_assignee?: boolean;
        after_publish_id?: number;
      };
    },
  ) {
    return this.workflowsService.createStage(req.space.id, body.workflow_stage);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      workflow_stage: {
        name?: string;
        color?: string;
        position?: number;
        is_default?: boolean;
        allow_publish?: boolean;
        allow_admin_publish?: boolean;
        allow_all_users?: boolean;
        allow_admin_change?: boolean;
        allow_editor_change?: boolean;
        allow_all_stages?: boolean;
        story_editing_locked?: boolean;
        auto_remove_assignee?: boolean;
        user_ids?: number[];
        space_role_ids?: number[];
        workflow_stage_ids?: number[];
        after_publish_id?: number;
      };
    },
  ) {
    const result = await this.workflowsService.updateStage(req.space.id, parseInt(id), body.workflow_stage);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.workflowsService.deleteStage(req.space.id, parseInt(id));
  }
}
