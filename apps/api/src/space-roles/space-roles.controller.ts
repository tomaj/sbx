import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { SpaceRolesService } from './space-roles.service';

@Controller('v1/spaces/:spaceId/space_roles')
@UseGuards(TokenGuard)
export class SpaceRolesController {
  constructor(private readonly spaceRolesService: SpaceRolesService) {}

  @Get()
  async getSpaceRoles(@Req() req: any) {
    return this.spaceRolesService.findAll(req.space.id);
  }

  @Get(':id')
  async getSpaceRole(@Req() req: any, @Param('id') id: string) {
    const result = await this.spaceRolesService.findOne(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }
}
