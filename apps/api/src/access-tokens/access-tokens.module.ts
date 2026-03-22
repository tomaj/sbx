import { Module } from '@nestjs/common';
import { AccessTokensController } from './access-tokens.controller';
import { AccessTokensAdminController } from './access-tokens-admin.controller';
import { AccessTokensService } from './access-tokens.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [AccessTokensController, AccessTokensAdminController],
  providers: [AccessTokensService, TokenGuard, SessionGuard],
})
export class AccessTokensModule {}
