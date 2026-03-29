import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesAdminController } from './branches-admin.controller';
import { BranchesService } from './branches.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [BranchesController, BranchesAdminController],
  providers: [BranchesService, TokenGuard, SessionGuard, SessionOrTokenGuard],
})
export class BranchesModule {}
