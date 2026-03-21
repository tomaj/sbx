import { Module } from '@nestjs/common';
import { ComponentsController } from './components.controller';
import { ComponentsAdminController } from './components-admin.controller';
import { ComponentsService } from './components.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [ComponentsController, ComponentsAdminController],
  providers: [ComponentsService, TokenGuard, SessionGuard],
})
export class ComponentsModule {}
