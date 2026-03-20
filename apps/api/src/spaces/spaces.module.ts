import { Module } from '@nestjs/common';
import { SpacesCdnController } from './spaces-cdn.controller';
import { SpacesService } from './spaces.service';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [SpacesCdnController],
  providers: [SpacesService, TokenGuard],
})
export class SpacesModule {}
