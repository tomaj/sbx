import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [ActivitiesController],
  providers: [ActivitiesService, TokenGuard],
})
export class ActivitiesModule {}
