import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { SpacesService } from './spaces.service';

@Controller('v1/spaces')
@UseGuards(SessionOrTokenGuard)
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get()
  async list() {
    return this.spacesService.getAllSpaces();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const result = await this.spacesService.getSpaceById(parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      space: {
        name?: string;
        domain?: string | null;
        default_lang?: string;
        default_root?: string | null;
        preview_urls?: { name: string; location: string }[];
        encode_url?: boolean;
        mobile_width?: number;
        visual_editor_disabled?: boolean;
        asset_library_settings?: Record<string, unknown>;
      };
    },
  ) {
    const s = body.space;
    const result = await this.spacesService.updateSpace(parseInt(id), {
      name: s.name,
      domain: s.domain,
      defaultRoot: s.default_root,
      previewUrls: s.preview_urls,
      encodeUrl: s.encode_url,
      mobileWidth: s.mobile_width,
      visualEditorDisabled: s.visual_editor_disabled,
      assetLibrarySettings: s.asset_library_settings,
    });
    if (!result) throw new NotFoundException();
    return result;
  }
}
