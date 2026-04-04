import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { SpacesService } from './spaces.service';
import { UsersService } from '../users/users.service';
import { SpaceRolesService } from '../space-roles/space-roles.service';
import { BaseAdminController } from '../shared/base-admin.controller';

@ApiTags('Spaces - Admin')
@Controller('v1/admin')
@Auth('session')
export class SpacesAdminController extends BaseAdminController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly usersService: UsersService,
    private readonly spaceRolesService: SpaceRolesService,
  ) {
    super();
  }

  @Get('spaces')
  getAllSpaces() {
    return this.spacesService.getAllSpaces();
  }

  @Post('spaces')
  createSpace(@Body() body: { name: string; domain?: string | null }) {
    return this.spacesService.createSpace({ name: body.name, domain: body.domain });
  }

  @Get('spaces/:id/roles')
  getSpaceRoles(@Param('id', ParseIntPipe) id: number) {
    return this.spaceRolesService.findAll(id);
  }

  @Get('spaces/:id/users/search')
  searchUsersForSpace(@Param('id', ParseIntPipe) id: number, @Query('q') q: string) {
    return this.usersService.searchUsersForSpace(id, q ?? '');
  }

  @Post('users')
  createUser(@Body() body: { firstname: string; lastname: string; email: string }) {
    return this.usersService.createUser(body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteUser(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { firstname?: string; lastname?: string; disabled?: boolean },
  ) {
    return this.usersService.updateUser(id, body);
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
    const { page: parsedPage, perPage: parsedPerPage } = this.parsePagination(page, perPage);
    return this.usersService.getAllUsers({
      page: parsedPage,
      perPage: parsedPerPage,
      search: search || undefined,
      filter: (filter as 'all' | 'internal' | 'disabled') || 'all',
      sortBy: sortBy || 'firstname',
      sortDir: (sortDir as 'asc' | 'desc') || 'asc',
    });
  }
}
