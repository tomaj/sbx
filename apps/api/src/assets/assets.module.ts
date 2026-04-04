import { Module } from '@nestjs/common';
import { AssetsAdminController } from './assets-admin.controller';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AiModule } from '../ai/ai.module';
import { AiConfigurationsModule } from '../ai-configurations/ai-configurations.module';

@Module({
  imports: [WebhooksModule, AiModule, AiConfigurationsModule],
  controllers: [AssetsAdminController, AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
