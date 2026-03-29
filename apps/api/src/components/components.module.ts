import { Module } from '@nestjs/common';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';

@Module({
  controllers: [ComponentsController],
  providers: [ComponentsService, TokenGuard, SessionOrTokenGuard],
})
export class ComponentsModule {}
