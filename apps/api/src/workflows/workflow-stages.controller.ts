import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { WorkflowsService } from './workflows.service';
import { QueryParserUtil } from '../shared/query-parser.util';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Workflow Stages - MAPI')
@Controller('v1/spaces/:spaceId/workflow_stages')
@Auth('session-or-token')
export class WorkflowStagesController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('exclude_id') excludeId?: string,
    @Query('by_ids') byIds?: string,
    @Query('search') search?: string,
    @Query('in_workflow') inWorkflow?: string,
  ) {
    return this.workflowsService.listStages(req.space.id, {
      excludeId: QueryParserUtil.parseOptionalInt(excludeId),
      byIds: QueryParserUtil.parseCsvToInts(byIds),
      search,
      inWorkflow: QueryParserUtil.parseOptionalInt(inWorkflow),
    });
  }

  @Get(':id')
  async get(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(await this.workflowsService.getStage(req.space.id, id));
  }

  @Post()
  @HttpCode(201)
  async create(
    @Req() req: AuthenticatedRequest,
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
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
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
    return ResultGuard.throwIfNotFound(
      await this.workflowsService.updateStage(req.space.id, id, body.workflow_stage),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    await this.workflowsService.deleteStage(req.space.id, id);
    return {};
  }
}
