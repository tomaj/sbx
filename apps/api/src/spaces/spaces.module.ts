import { Module } from '@nestjs/common';
import { SpacesCdnController } from './spaces-cdn.controller';
import { SpacesAdminController } from './spaces-admin.controller';
import { SpacesService } from './spaces.service';
import { UsersService } from '../users/users.service';
import { SpaceRolesService } from '../space-roles/space-roles.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [SpacesCdnController, SpacesAdminController],
  providers: [SpacesService, UsersService, SpaceRolesService, TokenGuard, SessionGuard],
})
export class SpacesModule {}
