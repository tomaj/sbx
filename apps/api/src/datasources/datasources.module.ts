import { Module } from '@nestjs/common';
import { DatasourcesController } from './datasources.controller';
import { DatasourcesMapiController } from './datasources-mapi.controller';
import { DatasourceEntriesMapiController } from './datasource-entries-mapi.controller';
import { DatasourcesService } from './datasources.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [
    DatasourcesController,
    DatasourcesMapiController,
    DatasourceEntriesMapiController,
  ],
  providers: [DatasourcesService, TokenGuard, SessionGuard, SessionOrTokenGuard],
})
export class DatasourcesModule {}
