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
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Workflows - MAPI')
@Controller('v1/spaces/:spaceId/workflows')
@Auth('session-or-token')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest, @Query('content_type') contentType?: string) {
    return this.workflowsService.adminList(req.space.id, { contentType });
  }

  @Get(':id')
  async get(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(
      await this.workflowsService.adminGetWorkflow(req.space.id, id),
    );
  }

  @Post()
  @HttpCode(201)
  async create(
    @Req() req: AuthenticatedRequest,
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
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { workflow: { name?: string; content_types?: string[]; is_default?: boolean } },
  ) {
    return ResultGuard.throwIfNotFound(
      await this.workflowsService.adminUpdate(req.space.id, id, {
        name: body.workflow.name,
        contentTypes: body.workflow.content_types,
        isDefault: body.workflow.is_default,
      }),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    await this.workflowsService.adminDelete(req.space.id, id);
    return {};
  }
}
