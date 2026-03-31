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

@Controller('v1/spaces/:spaceId/workflows')
@UseGuards(SessionOrTokenGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  async list(@Req() req: any, @Query('content_type') contentType?: string) {
    return this.workflowsService.adminList(req.space.id, { contentType });
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const result = await this.workflowsService.adminGetWorkflow(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post()
  @HttpCode(201)
  async create(
    @Req() req: any,
    @Body() body: { workflow: { name: string; content_types?: string[]; is_default?: boolean } },
  ) {
    return this.workflowsService.adminCreate(req.space.id, {
      name: body.workflow.name,
      contentTypes: body.workflow.content_types,
      isDefault: body.workflow.is_default,
    });
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { workflow: { name?: string; content_types?: string[]; is_default?: boolean } },
  ) {
    const result = await this.workflowsService.adminUpdate(req.space.id, parseInt(id), {
      name: body.workflow.name,
      contentTypes: body.workflow.content_types,
      isDefault: body.workflow.is_default,
    });
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.workflowsService.adminDelete(req.space.id, parseInt(id));
  }
}
