import { Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { SpaceRolesService } from './space-roles.service';
import { BaseCrudController } from '../shared/base-crud.controller';
import { ResultGuard } from '../shared/result-guard.util';
import { BaseCrudService } from '../shared/base-crud.service';
import { AuthenticatedRequest } from '../auth/authenticated-request.interface';

@ApiTags('Space Roles - MAPI')
@Controller('v1/spaces/:spaceId/space_roles')
@Auth('session-or-token')
export class SpaceRolesController extends BaseCrudController<unknown> {
  constructor(private readonly spaceRolesService: SpaceRolesService) {
    super();
  }

  protected get service(): BaseCrudService<unknown> {
    // SpaceRolesService is not a BaseCrudService subclass; uses adminFindOne/adminList
    return this.spaceRolesService as unknown as BaseCrudService<unknown>;
  }

  protected async doList(spaceId: number, query: Record<string, string>): Promise<unknown> {
    return this.spaceRolesService.adminList(spaceId, {
      search: query.search,
      by_ids: query.by_ids,
    });
  }

  protected async doCreate(spaceId: number, body: any): Promise<unknown> {
    return this.spaceRolesService.create(spaceId, body.space_role ?? {});
  }

  protected async doUpdate(spaceId: number, id: number, body: any): Promise<unknown> {
    return ResultGuard.throwIfNotFound(
      await this.spaceRolesService.update(spaceId, id, body.space_role ?? {}),
    );
  }

  // Space roles uses adminFindOne which includes user_count
  @Get(':id')
  async get(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(await this.spaceRolesService.adminFindOne(req.space.id, id));
  }

  // Space roles delete returns 200 with the deleted role (not 204 empty)
  @Delete(':id')
  @HttpCode(200)
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(await this.spaceRolesService.remove(req.space.id, id));
  }
}
