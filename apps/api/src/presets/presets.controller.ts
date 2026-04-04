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
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { PresetsService } from './presets.service';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Presets - MAPI')
@Controller('v1/spaces/:spaceId/presets')
@Auth('session-or-token')
export class PresetsController {
  constructor(private readonly presetsService: PresetsService) {}

  @Get()
  async getPresets(@Req() req: any, @Query('component_id') componentId?: string) {
    return this.presetsService.findAll(
      req.space.id,
      componentId ? parseInt(componentId) : undefined,
    );
  }

  @Get(':id')
  async getPreset(@Req() req: any, @Param('id') id: string) {
    return ResultGuard.throwIfNotFound(await this.presetsService.findOne(req.space.id, parseInt(id)));
  }

  @Post()
  @HttpCode(201)
  async createPreset(
    @Req() req: any,
    @Body()
    body: {
      preset: {
        name: string;
        component_id: number;
        preset?: Record<string, any>;
        image?: string;
        color?: string;
        icon?: string;
        description?: string;
      };
    },
  ) {
    return this.presetsService.create(req.space.id, body.preset);
  }

  @Put(':id')
  async updatePreset(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      preset: {
        name?: string;
        component_id?: number;
        preset?: Record<string, any>;
        image?: string | null;
        color?: string | null;
        icon?: string | null;
        description?: string | null;
      };
    },
  ) {
    return ResultGuard.throwIfNotFound(
      await this.presetsService.update(req.space.id, parseInt(id), body.preset),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  async deletePreset(@Req() req: any, @Param('id') id: string) {
    return ResultGuard.throwIfNotFound(await this.presetsService.remove(req.space.id, parseInt(id)));
  }
}
