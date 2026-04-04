import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { WorkflowsService } from './workflows.service';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Workflows - MAPI')
@Controller('v1/spaces/:spaceId/workflows')
@Auth('session-or-token')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  async list(@Req() req: any, @Query('content_type') contentType?: string) {
    return this.workflowsService.adminList(req.space.id, { contentType });
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    return ResultGuard.throwIfNotFound(await this.workflowsService.adminGetWorkflow(req.space.id, parseInt(id)));
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
    return ResultGuard.throwIfNotFound(
      await this.workflowsService.adminUpdate(req.space.id, parseInt(id), {
        name: body.workflow.name,
        contentTypes: body.workflow.content_types,
        isDefault: body.workflow.is_default,
      }),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.workflowsService.adminDelete(req.space.id, parseInt(id));
  }
}
