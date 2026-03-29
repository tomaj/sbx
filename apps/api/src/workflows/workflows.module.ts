import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowStagesController } from './workflow-stages.controller';
import { WorkflowsService } from './workflows.service';
import { SessionGuard } from '../auth/session.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [WorkflowsController, WorkflowStagesController],
  providers: [WorkflowsService, SessionGuard, TokenGuard, SessionOrTokenGuard],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
