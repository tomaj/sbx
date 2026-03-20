import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [BranchesController],
  providers: [BranchesService, TokenGuard],
})
export class BranchesModule {}
