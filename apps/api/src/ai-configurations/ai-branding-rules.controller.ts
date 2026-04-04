import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { AiConfigurationsService } from './ai-configurations.service';
import { AiBrandingRule } from '../ai/ai.types';

@ApiTags('AI Configurations - MAPI')
@Controller('v1/spaces/:spaceId/ai_branding_rules')
@Auth('session-or-token')
export class AiBrandingRulesController {
  constructor(private readonly service: AiConfigurationsService) {}

  @Get()
  get(@Param('spaceId', ParseIntPipe) spaceId: number) {
    return this.service.getBrandingRule(spaceId);
  }

  @Put()
  update(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Body() body: { ai_branding_rule: AiBrandingRule },
  ) {
    return this.service.updateBrandingRule(spaceId, body.ai_branding_rule);
  }
}
