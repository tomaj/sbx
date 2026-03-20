import { Module } from '@nestjs/common';
import { PersonalTokensController } from './personal-tokens.controller';
import { PersonalTokensService } from './personal-tokens.service';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [PersonalTokensController],
  providers: [PersonalTokensService, SessionGuard],
})
export class PersonalTokensModule {}
