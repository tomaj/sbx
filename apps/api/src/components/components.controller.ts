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

@Controller('v1/spaces/:spaceId')
@UseGuards(SessionOrTokenGuard)
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

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
    return this.componentsService.createComponent(req.space.id, body.component);
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
    return this.componentsService.updateComponent(req.space.id, parseInt(id), body.component);
  }

  @Delete('components/:id')
  @HttpCode(200)
  async deleteComponent(@Req() req: any, @Param('id') id: string) {
    await this.componentsService.deleteComponent(req.space.id, parseInt(id));
    return {};
  }
}
