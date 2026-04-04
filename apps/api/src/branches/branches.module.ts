import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { DeploymentsController } from './deployments.controller';
import { BranchesService } from './branches.service';

@Module({
  controllers: [BranchesController, DeploymentsController],
  providers: [BranchesService],
})
export class BranchesModule {}
