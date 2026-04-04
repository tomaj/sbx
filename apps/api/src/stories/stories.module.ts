import { Module } from '@nestjs/common';
import { StoriesCdnController } from './stories-cdn.controller';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { StoriesQueryService } from './stories-query.service';
import { StoriesVersionService } from './stories-version.service';
import { StoriesCdnService } from './stories-cdn.service';
import { LinksCdnController } from './links-cdn.controller';
import { LinksCdnService } from './links-cdn.service';
import { StoryVersionsController } from './story-versions.controller';
import { StoryVersionsService } from './story-versions.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [StoriesCdnController, LinksCdnController, StoriesController, StoryVersionsController],
  providers: [StoriesService, StoriesQueryService, StoriesVersionService, StoriesCdnService, LinksCdnService, StoryVersionsService],
})
export class StoriesModule {}
