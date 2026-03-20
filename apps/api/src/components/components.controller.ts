import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { ComponentsService } from './components.service';

@Controller('v1/spaces/:spaceId')
@UseGuards(TokenGuard)
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Get('components')
  async getComponents(@Req() req: any) {
    return this.componentsService.findAllComponents(req.space.id);
  }

  @Get('components/:id')
  async getComponent(@Req() req: any, @Param('id') id: string) {
    const result = await this.componentsService.findOneComponent(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Get('component_groups')
  async getComponentGroups(@Req() req: any) {
    return this.componentsService.findAllComponentGroups(req.space.id);
  }
}
