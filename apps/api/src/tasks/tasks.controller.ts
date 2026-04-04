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
  Req,
} from '@nestjs/common';
import { Auth } from '../auth/auth.decorator';
import { TasksService } from './tasks.service';
import { ResultGuard } from '../shared/result-guard.util';

@Controller('v1/spaces/:spaceId/tasks')
@Auth('session-or-token')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getTasks(@Req() req: AuthenticatedRequest) {
    return this.tasksService.findAll(req.space.id);
  }

  @Get(':id')
  async getTask(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(await this.tasksService.findOne(req.space.id, id));
  }

  @Post()
  @HttpCode(201)
  async createTask(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      task: {
        name: string;
        description?: string;
        task_type?: string;
        webhook_url?: string;
        user_dialog?: any;
      };
    },
  ) {
    return this.tasksService.create(req.space.id, body.task);
  }

  @Put(':id')
  async updateTask(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      task: {
        name?: string;
        description?: string;
        task_type?: string;
        webhook_url?: string;
        user_dialog?: any;
      };
    },
  ) {
    return this.tasksService.update(req.space.id, id, body.task);
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteTask(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    await this.tasksService.remove(req.space.id, id);
    return {};
  }

  @Post(':id/execute')
  @HttpCode(200)
  async executeTask(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const user = req.adminUser;
    return this.tasksService.execute(req.space.id, id, body?.dialog_values ?? body ?? {}, user);
  }
}
