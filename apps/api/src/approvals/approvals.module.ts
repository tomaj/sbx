import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalsService, TokenGuard, SessionOrTokenGuard],
})
export class ApprovalsModule {}
