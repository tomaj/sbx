import { Module } from '@nestjs/common';
import { SpaceStatisticsController, OrgStatisticsController } from './statistics.controller';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [SpaceStatisticsController, OrgStatisticsController],
  providers: [SessionOrTokenGuard, SessionGuard],
})
export class StatisticsModule {}
