import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { SpacesService } from './spaces.service';
import { UsersService } from '../users/users.service';

@Controller('v1/admin')
@UseGuards(SessionGuard)
export class SpacesAdminController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly usersService: UsersService,
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
  updateSpace(@Param('id') id: string, @Body() body: { name?: string; defaultRoot?: string | null }) {
    return this.spacesService.updateSpace(parseInt(id), body);
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
