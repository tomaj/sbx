import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { SpacesService } from './spaces.service';
import { UsersService } from '../users/users.service';
import { SpaceRolesService } from '../space-roles/space-roles.service';

@Controller('v1/admin')
@UseGuards(SessionGuard)
export class SpacesAdminController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly usersService: UsersService,
    private readonly spaceRolesService: SpaceRolesService,
  ) {}

  @Get('spaces')
  getAllSpaces() {
    return this.spacesService.getAllSpaces();
  }

  @Get('spaces/:id')
  getSpace(@Param('id') id: string) {
    return this.spacesService.getSpaceById(parseInt(id));
  }

  @Patch('spaces/:id')
  updateSpace(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      defaultRoot?: string | null;
      domain?: string | null;
      previewUrls?: { name: string; location: string }[];
      encodeUrl?: boolean;
      mobileWidth?: number;
      visualEditorDisabled?: boolean;
      assetLibrarySettings?: Record<string, unknown>;
    },
  ) {
    return this.spacesService.updateSpace(parseInt(id), body);
  }

  // Space collaborators (members)
  @Get('spaces/:id/collaborators')
  getSpaceMembers(@Param('id') id: string) {
    return this.usersService.getSpaceMembers(parseInt(id));
  }

  @Post('spaces/:id/collaborators')
  addSpaceMember(
    @Param('id') id: string,
    @Body() body: { userId: number; role: string; spaceRoleId?: number | null; spaceRoleIds?: number[] },
  ) {
    return this.usersService.addSpaceMember(parseInt(id), body.userId, body.role, body.spaceRoleId, body.spaceRoleIds);
  }

  @Patch('spaces/:id/collaborators/:memberId')
  updateSpaceMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: { role?: string; spaceRoleId?: number | null; spaceRoleIds?: number[] },
  ) {
    return this.usersService.updateSpaceMember(parseInt(id), parseInt(memberId), body);
  }

  @Delete('spaces/:id/collaborators/:memberId')
  removeSpaceMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.usersService.removeSpaceMember(parseInt(id), parseInt(memberId));
  }

  @Get('spaces/:id/roles')
  getSpaceRoles(@Param('id') id: string) {
    return this.spaceRolesService.findAll(parseInt(id));
  }

  @Get('spaces/:id/users/search')
  searchUsersForSpace(@Param('id') id: string, @Query('q') q: string) {
    return this.usersService.searchUsersForSpace(parseInt(id), q ?? '');
  }

  @Post('users')
  createUser(@Body() body: { firstname: string; lastname: string; email: string }) {
    return this.usersService.createUser(body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(parseInt(id));
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { firstname?: string; lastname?: string; disabled?: boolean },
  ) {
    return this.usersService.updateUser(parseInt(id), body);
  }

  @Get('users')
  getUsers(
    @Query('page') page = '1',
    @Query('per_page') perPage = '10',
    @Query('search') search?: string,
    @Query('filter') filter?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_dir') sortDir?: string,
  ) {
    return this.usersService.getAllUsers({
      page: Math.max(1, parseInt(page) || 1),
      perPage: Math.min(100, parseInt(perPage) || 10),
      search: search || undefined,
      filter: (filter as 'all' | 'internal' | 'disabled') || 'all',
      sortBy: sortBy || 'firstname',
      sortDir: (sortDir as 'asc' | 'desc') || 'asc',
    });
  }
}
