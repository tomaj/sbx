import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { SpaceRolesService } from './space-roles.service';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Space Roles - MAPI')
@Controller('v1/spaces/:spaceId/space_roles')
@Auth('session-or-token')
export class SpaceRolesController {
  constructor(private readonly spaceRolesService: SpaceRolesService) {}

  @Get()
  async getSpaceRoles(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('by_ids') byIds?: string,
  ) {
    return this.spaceRolesService.adminList(req.space.id, { search, by_ids: byIds });
  }

  @Get(':id')
  async getSpaceRole(@Req() req: any, @Param('id') id: string) {
    return ResultGuard.throwIfNotFound(await this.spaceRolesService.adminFindOne(req.space.id, parseInt(id)));
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
    return ResultGuard.throwIfNotFound(
      await this.spaceRolesService.update(req.space.id, parseInt(id), body.space_role ?? {}),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteSpaceRole(@Req() req: any, @Param('id') id: string) {
    return ResultGuard.throwIfNotFound(await this.spaceRolesService.remove(req.space.id, parseInt(id)));
  }
}
