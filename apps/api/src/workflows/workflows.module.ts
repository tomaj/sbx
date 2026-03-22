import { Module } from '@nestjs/common';
import { WorkflowsAdminController } from './workflows-admin.controller';
import { WorkflowsService } from './workflows.service';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [WorkflowsAdminController],
  providers: [WorkflowsService, SessionGuard],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
