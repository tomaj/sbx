import { Module } from '@nestjs/common';
import { WorkflowStageChangesController } from './workflow-stage-changes.controller';
import { WorkflowStageChangesService } from './workflow-stage-changes.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [WorkflowStageChangesController],
  providers: [WorkflowStageChangesService, TokenGuard, SessionOrTokenGuard],
})
export class WorkflowStageChangesModule {}
