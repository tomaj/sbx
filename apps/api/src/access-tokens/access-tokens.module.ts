import { Module } from '@nestjs/common';
import { AccessTokensController } from './access-tokens.controller';
import { AccessTokensService } from './access-tokens.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [AccessTokensController],
  providers: [AccessTokensService],
})
export class AccessTokensModule {}
