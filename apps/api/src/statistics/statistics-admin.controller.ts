import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { StatisticsService } from './statistics.service';

@ApiTags('Statistics - Admin')
@Controller('v1/admin/spaces/:spaceId/statistics')
@Auth('session')
export class StatisticsAdminController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('traffic')
  async getTraffic(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('period') period = 'this_month',
  ) {
    return this.statisticsService.findSpaceTraffic(spaceId, period);
  }

}
