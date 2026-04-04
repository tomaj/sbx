import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { AiConfigurationsService } from './ai-configurations.service';
import type { AiBrandingRule } from '../ai/ai.types';

@ApiTags('AI Configurations - MAPI')
@Controller('v1/spaces/:spaceId/ai_branding_rules')
@Auth('session-or-token')
export class AiBrandingRulesController {
  constructor(private readonly service: AiConfigurationsService) {}

  @Get()
  get(@Param('spaceId') spaceId: string) {
    return this.service.getBrandingRule(parseInt(spaceId));
  }

  @Put()
  update(
    @Param('spaceId') spaceId: string,
    @Body() body: { ai_branding_rule: AiBrandingRule },
  ) {
    return this.service.updateBrandingRule(parseInt(spaceId), body.ai_branding_rule);
  }
}
