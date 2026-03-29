import { Module } from '@nestjs/common';
import { CollaboratorsController } from './collaborators.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TokenGuard } from '../auth/token.guard';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { SessionGuard } from '../auth/session.guard';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [CollaboratorsController, UsersController],
  providers: [UsersService, TokenGuard, SessionOrTokenGuard, SessionGuard],
  exports: [UsersService],
})
export class UsersModule {}
