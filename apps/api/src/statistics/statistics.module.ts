import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SpaceStatisticsController, OrgStatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { StatisticsInterceptor } from './statistics.interceptor';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [SpaceStatisticsController, OrgStatisticsController],
  providers: [
    StatisticsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: StatisticsInterceptor,
    },
  ],
  exports: [StatisticsService],
})
export class StatisticsModule {}
