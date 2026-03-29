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

  @Post('spaces')
  createSpace(@Body() body: { name: string; domain?: string | null }) {
    return this.spacesService.createSpace({ name: body.name, domain: body.domain });
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
