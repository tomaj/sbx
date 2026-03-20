import { Module } from '@nestjs/common';
import { ReleasesController } from './releases.controller';
import { ReleasesService } from './releases.service';
import { TokenGuard } from '../auth/token.guard';

@Module({
  controllers: [ReleasesController],
  providers: [ReleasesService, TokenGuard],
})
export class ReleasesModule {}
