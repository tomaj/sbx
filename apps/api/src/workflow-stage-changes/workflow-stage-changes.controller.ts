import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { WorkflowStageChangesService } from './workflow-stage-changes.service';

@Controller('v1/spaces/:spaceId/workflow_stage_changes')
@UseGuards(SessionOrTokenGuard)
export class WorkflowStageChangesController {
  constructor(private readonly workflowStageChangesService: WorkflowStageChangesService) {}

  @Get()
  async getWorkflowStageChanges(@Req() req: any, @Query('with_story') withStory?: string) {
    const storyId = withStory ? parseInt(withStory) : undefined;
    return this.workflowStageChangesService.findAll(req.space.id, storyId);
  }

  @Post()
  @HttpCode(201)
  async createWorkflowStageChange(
    @Req() req: any,
    @Body()
    body: {
      workflow_stage_change: { workflow_stage_id: number; story_id: number };
      release_id?: number;
      notify?: boolean;
      comment?: { message: string };
      assign?: { space_role_ids?: number[]; user_ids?: number[] };
    },
  ) {
    return this.workflowStageChangesService.create(req.space.id, body.workflow_stage_change, {
      releaseId: body.release_id,
      notify: body.notify,
      comment: body.comment,
      assign: body.assign,
    });
  }
}
