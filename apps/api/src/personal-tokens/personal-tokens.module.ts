import { Module } from '@nestjs/common';
import { PersonalTokensController } from './personal-tokens.controller';
import { PersonalTokensService } from './personal-tokens.service';

@Module({
  controllers: [PersonalTokensController],
  providers: [PersonalTokensService],
})
export class PersonalTokensModule {}
