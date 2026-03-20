import { Module } from '@nestjs/common';
import { SpacesCdnController } from './spaces-cdn.controller';
import { SpacesAdminController } from './spaces-admin.controller';
import { SpacesService } from './spaces.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [SpacesCdnController, SpacesAdminController],
  providers: [SpacesService, TokenGuard, SessionGuard],
})
export class SpacesModule {}
