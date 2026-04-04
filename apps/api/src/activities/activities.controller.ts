import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { Controller, Get, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { ActivitiesService } from './activities.service';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Activities - MAPI')
@Controller('v1/spaces/:spaceId/activities')
@Auth('session-or-token')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  // Must be before :activityId wildcard
  @Get('stats')
  async getStats(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('period') period?: string,
  ) {
    return this.activitiesService.getStats(spaceId, period || 'last_14_days');
  }

  @Get()
  async getActivities(
    @Req() req: AuthenticatedRequest,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('created_at_gte') createdAtGte?: string,
    @Query('created_at_lte') createdAtLte?: string,
    @Query('by_owner_ids') byOwnerIds?: string,
    @Query('types') types?: string,
  ) {
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(
      page,
      perPage,
    );
    return this.activitiesService.findAllWithMeta(req.space.id, parsedPage, parsedPerPage, {
      createdAtGte: createdAtGte || undefined,
      createdAtLte: createdAtLte || undefined,
      byOwnerIds: QueryParserUtil.parseCsvToInts(byOwnerIds),
      types: QueryParserUtil.parseCsvToStrings(types),
    });
  }

  @Get(':activityId')
  async getActivity(
    @Req() req: AuthenticatedRequest,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.activitiesService.findOne(req.space.id, activityId);
  }
}
