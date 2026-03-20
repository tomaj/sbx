import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { DatasourcesService } from './datasources.service';

@Controller('v2/cdn')
@UseGuards(TokenGuard)
export class DatasourcesController {
  constructor(private readonly datasourcesService: DatasourcesService) {}

  @Get('datasources')
  async getDatasources(@Req() req: any) {
    return this.datasourcesService.findAll(req.space.id);
  }

  @Get('datasource_entries')
  async getDatasourceEntries(
    @Req() req: any,
    @Query('datasource') datasourceSlug?: string,
    @Query('dimension') dimension?: string,
    @Query('per_page') perPage = '25',
    @Query('page') page = '1',
  ) {
    return this.datasourcesService.findEntries(req.space.id, {
      datasourceSlug,
      dimension,
      perPage: parseInt(perPage),
      page: parseInt(page),
    });
  }
}
