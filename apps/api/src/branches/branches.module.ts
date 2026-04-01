import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesAdminController } from './branches-admin.controller';
import { DeploymentsController } from './deployments.controller';
import { BranchesService } from './branches.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [BranchesController, BranchesAdminController, DeploymentsController],
  providers: [BranchesService, TokenGuard, SessionGuard, SessionOrTokenGuard],
})
export class BranchesModule {}
