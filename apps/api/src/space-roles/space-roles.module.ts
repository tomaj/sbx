import { Module } from '@nestjs/common';
import { SpaceRolesController } from './space-roles.controller';
import { SpaceRolesService } from './space-roles.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [SpaceRolesController],
  providers: [SpaceRolesService, TokenGuard, SessionOrTokenGuard],
})
export class SpaceRolesModule {}
