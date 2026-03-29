import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { SpaceRolesService } from './space-roles.service';

@Controller('v1/spaces/:spaceId/space_roles')
@UseGuards(SessionOrTokenGuard)
export class SpaceRolesController {
  constructor(private readonly spaceRolesService: SpaceRolesService) {}

  @Get()
  async getSpaceRoles(@Req() req: any) {
    return this.spaceRolesService.adminList(req.space.id);
  }

  @Get(':id')
  async getSpaceRole(@Req() req: any, @Param('id') id: string) {
    const result = await this.spaceRolesService.adminFindOne(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post()
  @HttpCode(201)
  async createSpaceRole(@Req() req: any, @Body() body: { space_role: any }) {
    return this.spaceRolesService.create(req.space.id, body.space_role ?? {});
  }

  @Put(':id')
  async updateSpaceRole(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { space_role: any },
  ) {
    const result = await this.spaceRolesService.update(
      req.space.id,
      parseInt(id),
      body.space_role ?? {},
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteSpaceRole(@Req() req: any, @Param('id') id: string) {
    const deleted = await this.spaceRolesService.remove(req.space.id, parseInt(id));
    if (!deleted) throw new NotFoundException();
    return {};
  }
}
