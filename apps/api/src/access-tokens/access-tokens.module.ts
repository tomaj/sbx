import { Module } from '@nestjs/common';
import { AccessTokensController } from './access-tokens.controller';
import { AccessTokensService } from './access-tokens.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [AccessTokensController],
  providers: [AccessTokensService, TokenGuard, SessionGuard, SessionOrTokenGuard],
})
export class AccessTokensModule {}
