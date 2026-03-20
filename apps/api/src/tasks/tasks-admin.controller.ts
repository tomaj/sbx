import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { TasksService } from './tasks.service';

@Controller('v1/admin/spaces/:spaceId/tasks')
@UseGuards(SessionGuard)
export class TasksAdminController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(@Param('spaceId') spaceId: string) {
    return this.tasksService.findAll(parseInt(spaceId));
  }

  @Get(':id')
  async getOne(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    const result = await this.tasksService.findOne(parseInt(spaceId), parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post()
  create(
    @Param('spaceId') spaceId: string,
    @Body() body: { name: string; description?: string; task_type?: string; webhook_url?: string; user_dialog?: any },
  ) {
    return this.tasksService.create(parseInt(spaceId), body);
  }

  @Put(':id')
  update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; task_type?: string; webhook_url?: string; user_dialog?: any },
  ) {
    return this.tasksService.update(parseInt(spaceId), parseInt(id), body);
  }

  @Delete(':id')
  remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return this.tasksService.remove(parseInt(spaceId), parseInt(id));
  }

  @Post(':id/execute')
  execute(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.tasksService.execute(parseInt(spaceId), parseInt(id), body);
  }
}
