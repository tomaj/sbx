import { Module } from '@nestjs/common';
import { DatasourcesController } from './datasources.controller';
import { DatasourcesMapiController } from './datasources-mapi.controller';
import { DatasourceEntriesMapiController } from './datasource-entries-mapi.controller';
import { DatasourcesService } from './datasources.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [DatasourcesController, DatasourcesMapiController, DatasourceEntriesMapiController],
  providers: [DatasourcesService],
})
export class DatasourcesModule {}
