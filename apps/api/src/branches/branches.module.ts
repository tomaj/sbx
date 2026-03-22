import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesAdminController } from './branches-admin.controller';
import { BranchesService } from './branches.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [BranchesController, BranchesAdminController],
  providers: [BranchesService, TokenGuard, SessionGuard],
})
export class BranchesModule {}
