import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { SessionGuard } from '../auth/session.guard';

/**
 * Per-space statistics:
 *   GET /v1/spaces/:spaceId/statistics/:date
 */
@Controller('v1/spaces/:spaceId/statistics')
@UseGuards(SessionOrTokenGuard)
export class SpaceStatisticsController {
  @Get(':date')
  async getByDate(
    @Req() req: any,
    @Param('date') date: string,
  ) {
    // Return empty statistics array in correct MAPI shape.
    // We don't track per-request metrics yet — this is a stub for API compatibility.
    return { statistics: [] };
  }
}

/**
 * Org-level statistics:
 *   GET /v1/orgs/me/statistics/all_traffic
 *   GET /v1/orgs/me/statistics/assets_traffic
 */
@Controller('v1/orgs/me/statistics')
@UseGuards(SessionGuard)
export class OrgStatisticsController {
  @Get('all_traffic')
  async allTraffic(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('group_by') groupBy?: string,
  ) {
    return {
      montly_traffic_limit: 0,
      yearly_traffic_limit: 0,
      traffic_used_this_year: 0,
      cumulated_traffic: {
        requests_used_last_days: 0,
        total_requests_per_time_period: 0,
        total_traffic_per_time_period: 0,
        traffic: [],
      },
      traffic_top_spaces: {},
      traffic: [],
    };
  }

  @Get('assets_traffic')
  async assetsTraffic(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return { assets: [] };
  }
}
