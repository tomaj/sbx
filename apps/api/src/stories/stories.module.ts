import { Module } from '@nestjs/common';
import { StoriesCdnController } from './stories-cdn.controller';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { StoriesCdnService } from './stories-cdn.service';
import { LinksCdnController } from './links-cdn.controller';
import { LinksCdnService } from './links-cdn.service';
import { StoryVersionsController } from './story-versions.controller';
import { StoryVersionsService } from './story-versions.service';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { TokenGuard } from '../auth/token.guard';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [StoriesCdnController, LinksCdnController, StoriesController, StoryVersionsController],
  providers: [StoriesService, StoriesCdnService, LinksCdnService, StoryVersionsService, TokenGuard, SessionOrTokenGuard],
})
export class StoriesModule {}
