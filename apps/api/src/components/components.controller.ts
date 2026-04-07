import { AuthenticatedRequest, extractAuthorInfo } from '../auth/authenticated-request.interface';
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
  Query,
  Req,
  UseGuards,
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
import { MaintenanceModeGuard } from '../shared/maintenance-mode.guard';

@Controller('v1/spaces/:spaceId')
@Auth('session-or-token')
@UseGuards(MaintenanceModeGuard)
export class ComponentsController {
  constructor(
    private readonly componentsService: ComponentsService,
    private readonly componentVersionsService: ComponentVersionsService,
  ) {}

  // ─── Component Groups ────────────────────────────────────────────────────────

  @Get('component_groups')
  async getComponentGroups(
    @Req() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('with_parent') withParent?: string,
  ) {
    return this.componentsService.findAllComponentGroups(req.space.id, { search, withParent });
  }

  @Get('component_groups/:id')
  async getComponentGroup(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(
      await this.componentsService.findOneComponentGroup(req.space.id, id),
    );
  }

  @Post('component_groups')
  async createComponentGroup(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateComponentGroupDto,
  ) {
    const group = await this.componentsService.createComponentGroup(
      req.space.id,
      body.component_group,
    );
    return { component_group: group };
  }

  @Put('component_groups/:id')
  async updateComponentGroup(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateComponentGroupDto,
  ) {
    const group = await this.componentsService.updateComponentGroup(
      req.space.id,
      id,
      body.component_group,
    );
    return { component_group: group };
  }

  @Delete('component_groups/:id')
  @HttpCode(200)
  async deleteComponentGroup(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.componentsService.deleteComponentGroup(req.space.id, id);
    return {};
  }

  // ─── Components ──────────────────────────────────────────────────────────────

  @Get('components')
  async getComponents(
    @Req() req: AuthenticatedRequest,
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
  async duplicateComponent(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.componentsService.duplicateComponent(req.space.id, id);
  }

  @Get('components/:id')
  async getComponent(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(
      await this.componentsService.findOneComponent(req.space.id, id),
    );
  }

  @Post('components')
  async createComponent(@Req() req: AuthenticatedRequest, @Body() body: CreateComponentDto) {
    const { id: authorId, name: authorName } = extractAuthorInfo(req);
    return this.componentsService.createComponent(
      req.space.id,
      body.component,
      authorId,
      authorName,
    );
  }

  @Put('components/:id')
  async updateComponent(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateComponentDto,
  ) {
    const { id: authorId, name: authorName } = extractAuthorInfo(req);
    return this.componentsService.updateComponent(
      req.space.id,
      id,
      body.component,
      authorId,
      authorName,
    );
  }

  @Delete('components/:id')
  @HttpCode(200)
  async deleteComponent(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.componentsService.deleteComponent(req.space.id, id);
  }

  // ─── Component Versions ───────────────────────────────────────────────────

  /** Unified versions endpoint: GET /v1/spaces/:spaceId/versions?model=components&model_id=:id */
  @Get('versions')
  async listVersions(
    @Req() req: AuthenticatedRequest,
    @Query('model') model: string,
    @Query('model_id') modelId: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
  ) {
    if (model === 'components') {
      const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(
        page,
        perPage,
      );
      return this.componentVersionsService.listVersions({
        spaceId: req.space.id,
        componentId: QueryParserUtil.parseOptionalInt(modelId) ?? 0,
        page: parsedPage,
        perPage: parsedPerPage,
      });
    }
    return { versions: [] };
  }

  @Get('components/:id/component_versions/:versionId')
  async getComponentVersion(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.componentVersionsService.getVersion(req.space.id, id, versionId);
  }

  @Put('components/:id/versions/:versionId/restore')
  async restoreComponentVersion(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.componentsService.restoreComponentVersion(
      req.space.id,
      id,
      versionId,
      req.adminUser?.sbxUserId ?? null,
    );
  }
}
