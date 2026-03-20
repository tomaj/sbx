import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksAdminController } from './tasks-admin.controller';
import { TasksService } from './tasks.service';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [TasksController, TasksAdminController],
  providers: [TasksService, TokenGuard],
})
export class TasksModule {}
