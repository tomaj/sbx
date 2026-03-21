import { Module } from '@nestjs/common';
import { StoriesAdminController } from './stories-admin.controller';
import { StoriesCdnController } from './stories-cdn.controller';
import { StoriesService } from './stories.service';
import { StoriesCdnService } from './stories-cdn.service';
import { SessionGuard } from '../auth/session.guard';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [StoriesCdnController, StoriesAdminController],
  providers: [StoriesService, StoriesCdnService, SessionGuard, TokenGuard],
})
export class StoriesModule {}
