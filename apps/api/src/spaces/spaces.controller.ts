import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { SpacesService } from './spaces.service';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Spaces - MAPI')
@Controller('v1/spaces')
@Auth('session-or-token')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get()
  async list() {
    return this.spacesService.getAllSpaces();
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: { space: { name: string; domain?: string | null } }) {
    return this.spacesService.createSpace({ name: body.space.name, domain: body.space.domain });
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(await this.spacesService.getSpaceById(id));
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
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
        story_published_hook?: string | null;
        environments?: { name: string; location: string }[];
      };
    },
  ) {
    const s = body.space;
    return ResultGuard.throwIfNotFound(
      await this.spacesService.updateSpace(id, {
        name: s.name,
        domain: s.domain,
        defaultLang: s.default_lang,
        defaultRoot: s.default_root,
        previewUrls: s.preview_urls,
        encodeUrl: s.encode_url,
        mobileWidth: s.mobile_width,
        visualEditorDisabled: s.visual_editor_disabled,
        assetLibrarySettings: s.asset_library_settings,
        storyPublishedHook: s.story_published_hook,
        environments: s.environments,
      }),
    );
  }
}
