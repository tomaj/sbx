import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesAdminController } from './activities-admin.controller';
import { ActivitiesService } from './activities.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [ActivitiesController, ActivitiesAdminController],
  providers: [ActivitiesService, TokenGuard, SessionGuard],
})
export class ActivitiesModule {}
