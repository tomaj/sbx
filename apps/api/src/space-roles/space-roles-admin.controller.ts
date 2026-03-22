import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { SpaceRolesService } from './space-roles.service';

@Controller('v1/admin/spaces/:spaceId/roles')
@UseGuards(SessionGuard)
export class SpaceRolesAdminController {
  constructor(private readonly spaceRolesService: SpaceRolesService) {}

  @Get()
  list(@Param('spaceId') spaceId: string) {
    return this.spaceRolesService.adminList(parseInt(spaceId));
  }

  @Post()
  create(@Param('spaceId') spaceId: string, @Body() body: any) {
    return this.spaceRolesService.create(parseInt(spaceId), body);
  }

  @Get(':id')
  async getOne(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    const result = await this.spaceRolesService.adminFindOne(parseInt(spaceId), parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Patch(':id')
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const result = await this.spaceRolesService.update(parseInt(spaceId), parseInt(id), body);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  async remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    const ok = await this.spaceRolesService.remove(parseInt(spaceId), parseInt(id));
    if (!ok) throw new NotFoundException();
    return { deleted: true };
  }
}
