import { Controller, Get, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { StatisticsService } from './statistics.service';
import { AiLogsService } from '../ai/ai-logs.service';

/**
 * Per-space statistics:
 *   GET /v1/spaces/:spaceId/statistics/:date
 */
@ApiTags('Statistics - MAPI')
@Controller('v1/spaces/:spaceId/statistics')
@Auth('session-or-token')
export class SpaceStatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly aiLogsService: AiLogsService,
  ) {}

  // Specific routes MUST be before the :date wildcard
  @Get('traffic')
  async getTraffic(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('period') period = 'this_month',
  ) {
    return this.statisticsService.findSpaceTraffic(spaceId, period);
  }

  @Get('ai')
  async getAiStats(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('period') period = 'last_14_days',
  ) {
    return this.aiLogsService.getStats(spaceId, period);
  }

  @Get('assets_growth')
  async getAssetsGrowth(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('period') period = 'this_month',
  ) {
    return this.statisticsService.findSpaceAssetsGrowth(spaceId, period);
  }

  @Get(':date')
  async getByDate(
    @Req() req: any,
    @Param('date') date: string,
  ) {
    const rows = await this.statisticsService.findBySpaceAndMonth(req.space.id, date);
    return { statistics: rows };
  }
}

/**
 * Org-level statistics:
 *   GET /v1/orgs/me/statistics/all_traffic
 *   GET /v1/orgs/me/statistics/assets_traffic
 */
@ApiTags('Statistics - MAPI')
@Controller('v1/orgs/me/statistics')
@Auth('session')
export class OrgStatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('all_traffic')
  async allTraffic(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('group_by') groupBy?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const from = startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const to = endDate ?? today;
    const gb = (groupBy === 'day' || groupBy === 'year') ? groupBy : 'month';
    return this.statisticsService.orgAllTraffic(from, to, gb);
  }

  @Get('assets_traffic')
  async assetsTraffic(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const from = startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const to = endDate ?? today;
    return this.statisticsService.orgAssetsTraffic(from, to);
  }
}
