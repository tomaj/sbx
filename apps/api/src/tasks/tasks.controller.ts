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
import { TasksService } from './tasks.service';

@Controller('v1/spaces/:spaceId/tasks')
@UseGuards(SessionOrTokenGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getTasks(@Req() req: any) {
    return this.tasksService.findAll(req.space.id);
  }

  @Get(':id')
  async getTask(@Req() req: any, @Param('id') id: string) {
    const result = await this.tasksService.findOne(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post()
  @HttpCode(201)
  async createTask(
    @Req() req: any,
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
    @Req() req: any,
    @Param('id') id: string,
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
    return this.tasksService.update(req.space.id, parseInt(id), body.task);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteTask(@Req() req: any, @Param('id') id: string) {
    await this.tasksService.remove(req.space.id, parseInt(id));
  }

  @Post(':id/execute')
  async executeTask(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const user = req.user;
    return this.tasksService.execute(req.space.id, parseInt(id), body?.dialog_values ?? body ?? {}, user);
  }
}
