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
import { ComponentsService } from './components.service';
import { ComponentVersionsService } from './component-versions.service';

@Controller('v1/spaces/:spaceId')
@UseGuards(SessionOrTokenGuard)
export class ComponentsController {
  constructor(
    private readonly componentsService: ComponentsService,
    private readonly componentVersionsService: ComponentVersionsService,
  ) {}

  // ─── Component Groups ────────────────────────────────────────────────────────

  @Get('component_groups')
  async getComponentGroups(@Req() req: any) {
    return this.componentsService.findAllComponentGroups(req.space.id);
  }

  @Get('component_groups/:id')
  async getComponentGroup(@Req() req: any, @Param('id') id: string) {
    const result = await this.componentsService.findOneComponentGroup(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post('component_groups')
  async createComponentGroup(
    @Req() req: any,
    @Body() body: { component_group: { name: string; parent_uuid?: string | null } },
  ) {
    const group = await this.componentsService.createComponentGroup(req.space.id, body.component_group);
    return { component_group: group };
  }

  @Put('component_groups/:id')
  async updateComponentGroup(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { component_group: { name?: string } },
  ) {
    const group = await this.componentsService.updateComponentGroup(
      req.space.id,
      parseInt(id),
      body.component_group,
    );
    return { component_group: group };
  }

  @Delete('component_groups/:id')
  @HttpCode(200)
  async deleteComponentGroup(@Req() req: any, @Param('id') id: string) {
    await this.componentsService.deleteComponentGroup(req.space.id, parseInt(id));
    return {};
  }

  // ─── Components ──────────────────────────────────────────────────────────────

  @Get('components')
  async getComponents(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('in_group') inGroup?: string,
    @Query('is_root') isRoot?: string,
    @Query('by_ids') byIds?: string,
    @Query('sort_by') sortBy?: string,
  ) {
    return this.componentsService.findAllComponents(req.space.id, {
      search,
      in_group: inGroup,
      is_root: isRoot !== undefined ? isRoot === 'true' || isRoot === '1' : undefined,
      by_ids: byIds,
      sort_by: sortBy,
    });
  }

  @Post('components/:id/duplicate')
  async duplicateComponent(@Req() req: any, @Param('id') id: string) {
    return this.componentsService.duplicateComponent(req.space.id, parseInt(id));
  }

  @Get('components/:id')
  async getComponent(@Req() req: any, @Param('id') id: string) {
    const result = await this.componentsService.findOneComponent(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post('components')
  async createComponent(
    @Req() req: any,
    @Body()
    body: {
      component: {
        name: string;
        display_name?: string | null;
        schema?: any;
        is_root?: boolean;
        is_nestable?: boolean;
        color?: string | null;
        icon?: string | null;
        description?: string | null;
        component_group_uuid?: string | null;
      };
    },
  ) {
    const u1 = req.user;
    const authorName1 = u1 ? ([u1.firstname, u1.lastname].filter(Boolean).join(' ') || u1.email || null) : null;
    return this.componentsService.createComponent(req.space.id, body.component, u1?.id ?? null, authorName1);
  }

  @Put('components/:id')
  async updateComponent(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      component: {
        name?: string;
        display_name?: string | null;
        schema?: any;
        is_root?: boolean;
        is_nestable?: boolean;
        color?: string | null;
        icon?: string | null;
        description?: string | null;
        component_group_uuid?: string | null;
      };
    },
  ) {
    const u2 = req.user;
    const authorName2 = u2 ? ([u2.firstname, u2.lastname].filter(Boolean).join(' ') || u2.email || null) : null;
    return this.componentsService.updateComponent(req.space.id, parseInt(id), body.component, u2?.id ?? null, authorName2);
  }

  @Delete('components/:id')
  @HttpCode(200)
  async deleteComponent(@Req() req: any, @Param('id') id: string) {
    await this.componentsService.deleteComponent(req.space.id, parseInt(id));
    return {};
  }

  // ─── Component Versions ───────────────────────────────────────────────────

  /** Unified versions endpoint: GET /v1/spaces/:spaceId/versions?model=components&model_id=:id */
  @Get('versions')
  async listVersions(
    @Req() req: any,
    @Query('model') model: string,
    @Query('model_id') modelId: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
  ) {
    if (model === 'components') {
      return this.componentVersionsService.listVersions({
        spaceId: req.space.id,
        componentId: parseInt(modelId),
        page: Math.max(1, parseInt(page) || 1),
        perPage: Math.min(100, parseInt(perPage) || 25),
      });
    }
    return { versions: [] };
  }

  @Get('components/:id/component_versions/:versionId')
  async getComponentVersion(
    @Req() req: any,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.componentVersionsService.getVersion(req.space.id, parseInt(id), parseInt(versionId));
  }

  @Put('components/:id/versions/:versionId/restore')
  async restoreComponentVersion(
    @Req() req: any,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.componentsService.restoreComponentVersion(
      req.space.id,
      parseInt(id),
      parseInt(versionId),
      req.user?.id ?? null,
    );
  }
}
