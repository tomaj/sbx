import { Module } from '@nestjs/common';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';
import { ComponentVersionsService } from './component-versions.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [ComponentsController],
  providers: [ComponentsService, ComponentVersionsService, TokenGuard, SessionOrTokenGuard],
})
export class ComponentsModule {}
