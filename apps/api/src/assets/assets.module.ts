import { Module } from '@nestjs/common';
import { AssetsAdminController } from './assets-admin.controller';
import { AssetsService } from './assets.service';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [AssetsAdminController],
  providers: [AssetsService, SessionGuard],
})
export class AssetsModule {}
