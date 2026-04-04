import { Module } from '@nestjs/common';
import { WorkflowStageChangesController } from './workflow-stage-changes.controller';
import { WorkflowStageChangesService } from './workflow-stage-changes.service';

@Module({
  controllers: [WorkflowStageChangesController],
  providers: [WorkflowStageChangesService],
})
export class WorkflowStageChangesModule {}
