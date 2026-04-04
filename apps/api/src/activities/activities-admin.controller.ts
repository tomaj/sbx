import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { ActivitiesService } from './activities.service';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Activities - Admin')
@Controller('v1/admin/spaces/:spaceId/activities')
@Auth('session')
export class ActivitiesAdminController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('stats')
  async getStats(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('period') period?: string,
  ) {
    return this.activitiesService.getStats(spaceId, period || 'last_14_days');
  }

  @Get()
  async getActivities(
    @Param('spaceId') spaceId: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('by_owner_ids') byOwnerIds?: string,
    @Query('types') types?: string,
    @Query('created_at_gte') createdAtGte?: string,
    @Query('created_at_lte') createdAtLte?: string,
  ) {
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(page, perPage);
    return this.activitiesService.findAllWithMeta(
      parseInt(spaceId),
      parsedPage,
      parsedPerPage,
      {
        byOwnerIds: QueryParserUtil.parseCsvToInts(byOwnerIds),
        types: QueryParserUtil.parseCsvToStrings(types),
        createdAtGte: createdAtGte || undefined,
        createdAtLte: createdAtLte || undefined,
      },
    );
  }
}
