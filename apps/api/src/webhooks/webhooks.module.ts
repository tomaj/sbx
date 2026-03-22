import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksAdminController } from './webhooks-admin.controller';
import { WebhooksService } from './webhooks.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [WebhooksController, WebhooksAdminController],
  providers: [WebhooksService, TokenGuard, SessionGuard],
  exports: [WebhooksService],
})
export class WebhooksModule {}
