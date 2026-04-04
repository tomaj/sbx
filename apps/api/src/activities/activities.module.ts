import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesAdminController } from './activities-admin.controller';
import { ActivitiesService } from './activities.service';

@Module({
  controllers: [ActivitiesController, ActivitiesAdminController],
  providers: [ActivitiesService],
})
export class ActivitiesModule {}
