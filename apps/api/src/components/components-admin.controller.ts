import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { ComponentsService } from './components.service';

@Controller('v1/admin/spaces/:spaceId')
@UseGuards(SessionGuard)
export class ComponentsAdminController {
  constructor(private readonly componentsService: ComponentsService) {}

  // ─── Component Groups ────────────────────────────────────────────────────────

  @Get('component-groups')
  listGroups(@Param('spaceId') spaceId: string) {
    return this.componentsService.findAllComponentGroups(parseInt(spaceId));
  }

  @Post('component-groups')
  createGroup(
    @Param('spaceId') spaceId: string,
    @Body() body: { name: string; parent_uuid?: string | null },
  ) {
    return this.componentsService.createComponentGroup(parseInt(spaceId), body);
  }

  @Patch('component-groups/:groupId')
  updateGroup(
    @Param('spaceId') spaceId: string,
    @Param('groupId') groupId: string,
    @Body() body: { name?: string },
  ) {
    return this.componentsService.updateComponentGroup(parseInt(spaceId), parseInt(groupId), body);
  }

  @Delete('component-groups/:groupId')
  deleteGroup(@Param('spaceId') spaceId: string, @Param('groupId') groupId: string) {
    return this.componentsService.deleteComponentGroup(parseInt(spaceId), parseInt(groupId));
  }

  // ─── Components ─────────────────────────────────────────────────────────────

  @Get('component-counts')
  getCounts(@Param('spaceId') spaceId: string) {
    return this.componentsService.getComponentCounts(parseInt(spaceId));
  }

  @Get('components')
  list(
    @Param('spaceId') spaceId: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('search') search?: string,
    @Query('sort_field') sortField?: string,
    @Query('sort_dir') sortDir?: string,
    @Query('group_uuid') groupUuid?: string,
  ) {
    return this.componentsService.listComponents(parseInt(spaceId), {
      page: Math.max(1, parseInt(page) || 1),
      perPage: Math.min(100, parseInt(perPage) || 25),
      search,
      sortField,
      sortDir: sortDir === 'desc' ? 'desc' : 'asc',
      groupUuid: groupUuid === 'null' ? null : groupUuid,
    });
  }

  @Post('components')
  create(
    @Param('spaceId') spaceId: string,
    @Body()
    body: {
      name: string;
      display_name?: string | null;
      description?: string | null;
      schema?: any;
      is_root?: boolean;
      is_nestable?: boolean;
      component_group_uuid?: string | null;
      image?: string | null;
      color?: string | null;
      icon?: string | null;
    },
  ) {
    return this.componentsService.createComponent(parseInt(spaceId), body);
  }

  @Get('components/:componentId')
  getOne(@Param('spaceId') spaceId: string, @Param('componentId') componentId: string) {
    return this.componentsService.findOneComponent(parseInt(spaceId), parseInt(componentId));
  }

  @Patch('components/:componentId')
  update(
    @Param('spaceId') spaceId: string,
    @Param('componentId') componentId: string,
    @Body()
    body: {
      name?: string;
      display_name?: string | null;
      description?: string | null;
      schema?: any;
      is_root?: boolean;
      is_nestable?: boolean;
      component_group_uuid?: string | null;
      image?: string | null;
      color?: string | null;
      icon?: string | null;
    },
  ) {
    return this.componentsService.updateComponent(parseInt(spaceId), parseInt(componentId), body);
  }

  @Delete('components/:componentId')
  delete(@Param('spaceId') spaceId: string, @Param('componentId') componentId: string) {
    return this.componentsService.deleteComponent(parseInt(spaceId), parseInt(componentId));
  }

  @Post('components/:componentId/duplicate')
  duplicate(@Param('spaceId') spaceId: string, @Param('componentId') componentId: string) {
    return this.componentsService.duplicateComponent(parseInt(spaceId), parseInt(componentId));
  }
}
