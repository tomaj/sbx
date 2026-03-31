import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { ActivitiesService } from './activities.service';

@Controller('v1/spaces/:spaceId/activities')
@UseGuards(TokenGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  async getActivities(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('created_at_gte') createdAtGte?: string,
    @Query('created_at_lte') createdAtLte?: string,
    @Query('by_owner_ids') byOwnerIds?: string,
    @Query('types') types?: string,
  ) {
    return this.activitiesService.findAll(
      req.space.id,
      Math.max(1, parseInt(page) || 1),
      Math.min(100, parseInt(perPage) || 25),
      {
        createdAtGte: createdAtGte || undefined,
        createdAtLte: createdAtLte || undefined,
        byOwnerIds: byOwnerIds
          ? byOwnerIds
              .split(',')
              .map(Number)
              .filter(Boolean)
          : undefined,
        types: types
          ? types.split(',').filter(Boolean)
          : undefined,
      },
    );
  }

  @Get(':activityId')
  async getActivity(
    @Req() req: any,
    @Param('activityId') activityId: string,
  ) {
    return this.activitiesService.findOne(req.space.id, parseInt(activityId));
  }
}
