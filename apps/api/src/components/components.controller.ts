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
import { Auth } from '../auth/auth.decorator';
import { ComponentsService } from './components.service';
import { ComponentVersionsService } from './component-versions.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { CreateComponentGroupDto } from './dto/create-component-group.dto';
import { UpdateComponentGroupDto } from './dto/update-component-group.dto';
import { QueryParserUtil } from '../shared/query-parser.util';
import { ResultGuard } from '../shared/result-guard.util';

@Controller('v1/spaces/:spaceId')
@Auth('session-or-token')
export class ComponentsController {
  constructor(
    private readonly componentsService: ComponentsService,
    private readonly componentVersionsService: ComponentVersionsService,
  ) {}

  // ─── Component Groups ────────────────────────────────────────────────────────

  @Get('component_groups')
  async getComponentGroups(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('with_parent') withParent?: string,
  ) {
    return this.componentsService.findAllComponentGroups(req.space.id, { search, withParent });
  }

  @Get('component_groups/:id')
  async getComponentGroup(@Req() req: any, @Param('id') id: string) {
    return ResultGuard.throwIfNotFound(
      await this.componentsService.findOneComponentGroup(req.space.id, parseInt(id)),
    );
  }

  @Post('component_groups')
  async createComponentGroup(
    @Req() req: any,
    @Body() body: CreateComponentGroupDto,
  ) {
    const group = await this.componentsService.createComponentGroup(req.space.id, body.component_group);
    return { component_group: group };
  }

  @Put('component_groups/:id')
  async updateComponentGroup(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateComponentGroupDto,
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
      is_root: isRoot !== undefined ? QueryParserUtil.parseBoolean(isRoot) : undefined,
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
    return ResultGuard.throwIfNotFound(
      await this.componentsService.findOneComponent(req.space.id, parseInt(id)),
    );
  }

  @Post('components')
  async createComponent(
    @Req() req: any,
    @Body() body: CreateComponentDto,
  ) {
    const u1 = req.adminUser;
    const authorName1 = u1 ? ([u1.firstname, u1.lastname].filter(Boolean).join(' ') || u1.email || null) : null;
    return this.componentsService.createComponent(req.space.id, body.component, u1?.id ?? null, authorName1);
  }

  @Put('components/:id')
  async updateComponent(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateComponentDto,
  ) {
    const u2 = req.adminUser;
    const authorName2 = u2 ? ([u2.firstname, u2.lastname].filter(Boolean).join(' ') || u2.email || null) : null;
    return this.componentsService.updateComponent(req.space.id, parseInt(id), body.component, u2?.id ?? null, authorName2);
  }

  @Delete('components/:id')
  @HttpCode(200)
  async deleteComponent(@Req() req: any, @Param('id') id: string) {
    return this.componentsService.deleteComponent(req.space.id, parseInt(id));
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
      const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(page, perPage);
      return this.componentVersionsService.listVersions({
        spaceId: req.space.id,
        componentId: parseInt(modelId),
        page: parsedPage,
        perPage: parsedPerPage,
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
      req.adminUser?.id ?? null,
    );
  }
}
