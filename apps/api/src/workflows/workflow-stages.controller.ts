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
import { WorkflowsService } from './workflows.service';

@Controller('v1/spaces/:spaceId/workflow_stages')
@UseGuards(SessionOrTokenGuard)
export class WorkflowStagesController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  async list(@Req() req: any) {
    return this.workflowsService.listStages(req.space.id);
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
        workflow_id: number;
        color?: string;
        position?: number;
        allow_publish?: boolean;
        allow_all_users?: boolean;
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
        allow_publish?: boolean;
        allow_all_users?: boolean;
      };
    },
  ) {
    const result = await this.workflowsService.updateStage(req.space.id, parseInt(id), body.workflow_stage);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.workflowsService.deleteStage(req.space.id, parseInt(id));
    return {};
  }
}
