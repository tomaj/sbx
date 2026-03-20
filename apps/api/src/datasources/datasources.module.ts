import { Module } from '@nestjs/common';
import { DatasourcesController } from './datasources.controller';
import { DatasourcesAdminController } from './datasources-admin.controller';
import { DatasourcesService } from './datasources.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [DatasourcesController, DatasourcesAdminController],
  providers: [DatasourcesService, TokenGuard, SessionGuard],
})
export class DatasourcesModule {}
