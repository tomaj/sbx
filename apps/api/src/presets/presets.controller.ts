import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { PresetsService } from './presets.service';

@Controller('v1/spaces/:spaceId/presets')
@UseGuards(TokenGuard)
export class PresetsController {
  constructor(private readonly presetsService: PresetsService) {}

  @Get()
  async getPresets(@Req() req: any) {
    return this.presetsService.findAll(req.space.id);
  }

  @Get(':id')
  async getPreset(@Req() req: any, @Param('id') id: string) {
    const result = await this.presetsService.findOne(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }
}
