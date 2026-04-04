import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
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
  list(@Param('spaceId', ParseIntPipe) spaceId: number) {
    return this.service.listConfigurations(spaceId);
  }

  @Get('providers')
  getProviders() {
    return this.service.getProviders();
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number, @Param('spaceId', ParseIntPipe) spaceId: number) {
    return this.service.getConfiguration(id, spaceId);
  }

  @Post()
  @HttpCode(201)
  create(
    @Param('spaceId', ParseIntPipe) spaceId: number,
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
    return this.service.createConfiguration(spaceId, body.ai_configuration);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Param('spaceId', ParseIntPipe) spaceId: number,
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
    return this.service.updateConfiguration(id, spaceId, body.ai_configuration);
  }

  @Delete(':id')
  @HttpCode(200)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Param('spaceId', ParseIntPipe) spaceId: number,
  ) {
    await this.service.deleteConfiguration(id, spaceId);
    return {};
  }

  @Put(':id/set_as_default')
  setDefault(
    @Param('id', ParseIntPipe) id: number,
    @Param('spaceId', ParseIntPipe) spaceId: number,
  ) {
    return this.service.setDefault(id, spaceId);
  }
}
