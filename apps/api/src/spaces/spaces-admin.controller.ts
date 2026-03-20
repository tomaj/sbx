import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { SpacesService } from './spaces.service';

@Controller('v1/admin')
@UseGuards(SessionGuard)
export class SpacesAdminController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get('spaces')
  getAllSpaces() {
    return this.spacesService.getAllSpaces();
  }
}
