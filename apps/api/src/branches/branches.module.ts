import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesAdminController } from './branches-admin.controller';
import { DeploymentsController } from './deployments.controller';
import { BranchesService } from './branches.service';

@Module({
  controllers: [BranchesController, BranchesAdminController, DeploymentsController],
  providers: [BranchesService],
})
export class BranchesModule {}
