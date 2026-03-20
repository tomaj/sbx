import { Module } from '@nestjs/common';
import { CollaboratorsController } from './collaborators.controller';
import { UsersService } from './users.service';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [CollaboratorsController],
  providers: [UsersService, TokenGuard],
})
export class UsersModule {}
