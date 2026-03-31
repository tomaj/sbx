import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { PresetsService } from './presets.service';

@Controller('v1/spaces/:spaceId/presets')
@UseGuards(SessionOrTokenGuard)
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
    const result = await this.presetsService.findOne(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
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
    const result = await this.presetsService.update(req.space.id, parseInt(id), body.preset);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  @HttpCode(200)
  async deletePreset(@Req() req: any, @Param('id') id: string) {
    const result = await this.presetsService.remove(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }
}
