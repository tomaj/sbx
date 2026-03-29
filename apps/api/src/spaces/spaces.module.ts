import { Module } from '@nestjs/common';
import { SpacesCdnController } from './spaces-cdn.controller';
import { SpacesAdminController } from './spaces-admin.controller';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { UsersService } from '../users/users.service';
import { SpaceRolesService } from '../space-roles/space-roles.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [SpacesCdnController, SpacesAdminController, SpacesController],
  providers: [SpacesService, UsersService, SpaceRolesService, TokenGuard, SessionGuard, SessionOrTokenGuard],
})
export class SpacesModule {}
