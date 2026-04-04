import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowStagesController } from './workflow-stages.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  controllers: [WorkflowsController, WorkflowStagesController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
