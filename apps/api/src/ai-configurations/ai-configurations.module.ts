import { Module } from '@nestjs/common';
import { AiConfigurationsController } from './ai-configurations.controller';
import { AiConfigurationsSpacesController } from './ai-configurations-spaces.controller';
import { AiBrandingRulesController } from './ai-branding-rules.controller';
import { AiConfigurationsService } from './ai-configurations.service';

@Module({
  controllers: [
    AiConfigurationsController,
    AiConfigurationsSpacesController,
    AiBrandingRulesController,
  ],
  providers: [AiConfigurationsService],
  exports: [AiConfigurationsService],
})
export class AiConfigurationsModule {}
