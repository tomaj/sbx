import { Module } from '@nestjs/common';
import { DatasourcesController } from './datasources.controller';
import { DatasourcesService } from './datasources.service';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [DatasourcesController],
  providers: [DatasourcesService, TokenGuard],
})
export class DatasourcesModule {}
