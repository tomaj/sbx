import { Module } from '@nestjs/common';
import { AssetsAdminController } from './assets-admin.controller';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { SessionGuard } from '../auth/session.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [AssetsAdminController, AssetsController],
  providers: [AssetsService, SessionGuard, SessionOrTokenGuard],
})
export class AssetsModule {}
