import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { DatasourcesService } from './datasources.service';
import { QueryParserUtil } from '../shared/query-parser.util';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Datasources - CDN')
@Controller('v2/cdn')
@Auth('token')
export class DatasourcesController {
  constructor(private readonly datasourcesService: DatasourcesService) {}

  @Get('datasources')
  async getDatasources(@Req() req: any) {
    return this.datasourcesService.findAllCdn(req.space.id);
  }

  @Get('datasources/:id')
  async getDatasource(@Req() req: any, @Param('id') id: string) {
    return ResultGuard.throwIfNotFound(
      await this.datasourcesService.findOneCdn(req.space.id, parseInt(id)),
      'Datasource not found',
    );
  }

  @Get('datasource_entries')
  async getDatasourceEntries(
    @Req() req: any,
    @Query('datasource') datasourceSlug?: string,
    @Query('dimension') dimension?: string,
    @Query('per_page') perPage = '25',
    @Query('page') page = '1',
  ) {
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(page, perPage);
    return this.datasourcesService.findEntriesCdn(req.space.id, {
      datasourceSlug,
      dimension,
      perPage: parsedPerPage,
      page: parsedPage,
    });
  }
}
