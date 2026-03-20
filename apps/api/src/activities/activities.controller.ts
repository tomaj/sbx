import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
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
  ) {
    return this.activitiesService.findAll(req.space.id, parseInt(page), parseInt(perPage));
  }
}
