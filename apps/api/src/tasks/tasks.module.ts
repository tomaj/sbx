import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [TasksController],
  providers: [TasksService, TokenGuard, SessionOrTokenGuard],
})
export class TasksModule {}
