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
    @Query('user_ids') userIds?: string,
    @Query('keys') keys?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.activitiesService.findAllAdmin(
      parseInt(spaceId),
      Math.max(1, parseInt(page) || 1),
      Math.min(100, parseInt(perPage) || 25),
      {
        userIds: userIds ? userIds.split(',').map(Number).filter(Boolean) : undefined,
        keys: keys ? keys.split(',').filter(Boolean) : undefined,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo + 'T23:59:59') : undefined,
      },
    );
  }
}
