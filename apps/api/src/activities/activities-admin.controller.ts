import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { ActivitiesService } from './activities.service';

@Controller('v1/admin/spaces/:spaceId/activities')
@UseGuards(SessionGuard)
export class ActivitiesAdminController {
  constructor(private readonly activitiesService: ActivitiesService) {}

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
    return this.activitiesService.findAllWithMeta(
      parseInt(spaceId),
      Math.max(1, parseInt(page) || 1),
      Math.min(100, parseInt(perPage) || 25),
      {
        byOwnerIds: byOwnerIds
          ? byOwnerIds
              .split(',')
              .map(Number)
              .filter(Boolean)
          : undefined,
        types: types
          ? types.split(',').filter(Boolean)
          : undefined,
        createdAtGte: createdAtGte || undefined,
        createdAtLte: createdAtLte || undefined,
      },
    );
  }
}
