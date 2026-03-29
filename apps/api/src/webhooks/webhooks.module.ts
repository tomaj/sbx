import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, TokenGuard, SessionOrTokenGuard],
  exports: [WebhooksService],
})
export class WebhooksModule {}
