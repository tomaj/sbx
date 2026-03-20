import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { TasksService } from './tasks.service';

@Controller('v1/spaces/:spaceId/tasks')
@UseGuards(TokenGuard)
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
}
