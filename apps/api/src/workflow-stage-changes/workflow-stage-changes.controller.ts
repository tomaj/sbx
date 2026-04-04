import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { WorkflowStageChangesService } from './workflow-stage-changes.service';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Workflow Stage Changes - MAPI')
@Controller('v1/spaces/:spaceId/workflow_stage_changes')
@Auth('session-or-token')
export class WorkflowStageChangesController {
  constructor(private readonly workflowStageChangesService: WorkflowStageChangesService) {}

  @Get()
  async getWorkflowStageChanges(
    @Req() req: AuthenticatedRequest,
    @Query('with_story') withStory?: string,
  ) {
    const storyId = QueryParserUtil.parseOptionalInt(withStory);
    return this.workflowStageChangesService.findAll(req.space.id, storyId);
  }

  @Post()
  @HttpCode(201)
  async createWorkflowStageChange(
    @Req() req: AuthenticatedRequest,
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
