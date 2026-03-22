import { Module } from '@nestjs/common';
import { SpaceRolesController } from './space-roles.controller';
import { SpaceRolesAdminController } from './space-roles-admin.controller';
import { SpaceRolesService } from './space-roles.service';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [SpaceRolesController, SpaceRolesAdminController],
  providers: [SpaceRolesService, TokenGuard],
})
export class SpaceRolesModule {}
