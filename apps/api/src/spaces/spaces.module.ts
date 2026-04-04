import { Module } from '@nestjs/common';
import { SpacesCdnController } from './spaces-cdn.controller';
import { SpacesAdminController } from './spaces-admin.controller';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { UsersService } from '../users/users.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [SpacesCdnController, SpacesAdminController, SpacesController],
  providers: [SpacesService, UsersService],
})
export class SpacesModule {}
