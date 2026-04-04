import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { AiConfigurationsService } from './ai-configurations.service';

/**
 * Space-scoped variant of AiConfigurationsController.
 * Maps /v1/spaces/:spaceId/ai_configurations so the admin catch-all proxy works.
 */
@ApiTags('AI Configurations - MAPI')
@Controller('v1/spaces/:spaceId/ai_configurations')
@Auth('session-or-token')
export class AiConfigurationsSpacesController {
  constructor(private readonly service: AiConfigurationsService) {}

  @Get()
  list(@Param('spaceId') spaceId: string) {
    return this.service.listConfigurations(parseInt(spaceId));
  }

  @Get('providers')
  getProviders() {
    return this.service.getProviders();
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Param('spaceId') spaceId: string) {
    return this.service.getConfiguration(parseInt(id), parseInt(spaceId));
  }

  @Post()
  create(
    @Param('spaceId') spaceId: string,
    @Body() body: {
      ai_configuration: {
        name: string;
        description?: string | null;
        provider_name: string;
        model_identifier: string;
        api_key?: string | null;
        settings?: Record<string, unknown>;
      };
    },
  ) {
    return this.service.createConfiguration(parseInt(spaceId), body.ai_configuration);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Param('spaceId') spaceId: string,
    @Body() body: {
      ai_configuration: {
        name?: string;
        description?: string | null;
        provider_name?: string;
        model_identifier?: string;
        api_key?: string | null;
        settings?: Record<string, unknown>;
      };
    },
  ) {
    return this.service.updateConfiguration(parseInt(id), parseInt(spaceId), body.ai_configuration);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string, @Param('spaceId') spaceId: string) {
    await this.service.deleteConfiguration(parseInt(id), parseInt(spaceId));
  }

  @Put(':id/set_as_default')
  setDefault(@Param('id') id: string, @Param('spaceId') spaceId: string) {
    return this.service.setDefault(parseInt(id), parseInt(spaceId));
  }
}
