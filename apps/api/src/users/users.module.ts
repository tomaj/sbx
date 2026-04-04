import { Module } from '@nestjs/common';
import { CollaboratorsController } from './collaborators.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [CollaboratorsController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
