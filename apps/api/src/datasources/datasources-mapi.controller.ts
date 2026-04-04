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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { DatasourcesService } from './datasources.service';
import { QueryParserUtil } from '../shared/query-parser.util';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Datasources - MAPI')
@Controller('v1/spaces/:spaceId/datasources')
@Auth('session-or-token')
export class DatasourcesMapiController {
  constructor(private readonly datasourcesService: DatasourcesService) {}

  @Get()
  list(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('sort_by') sortBy?: string, // format: "name:asc" or "created_at:desc"
    @Query('search') search?: string,
    @Query('by_ids') byIds?: string,
  ) {
    const { field: sortField, dir: sortDirParsed } = QueryParserUtil.parseSortBy(
      sortBy,
      'name',
      'asc',
    );
    const byIdsArr = QueryParserUtil.parseCsvToInts(byIds);

    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(
      page,
      perPage,
    );
    return this.datasourcesService.listDatasourcesAdmin(spaceId, {
      page: parsedPage,
      perPage: Math.min(200, parsedPerPage),
      sortField,
      sortDir: sortDirParsed,
      search,
      byIds: byIdsArr,
    });
  }

  @Get(':id')
  async getOne(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ResultGuard.throwIfNotFound(
      await this.datasourcesService.findOne(spaceId, id),
      'Datasource not found',
    );
  }

  @Post()
  @HttpCode(201)
  async create(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Body()
    body: {
      datasource: {
        name: string;
        slug: string;
        dimensions_attributes?: { name: string; entry_value: string }[];
      };
    },
  ) {
    const ds = await this.datasourcesService.createDatasource(spaceId, body.datasource);
    return { datasource: ds };
  }

  @Put(':id')
  async update(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      datasource: {
        name?: string;
        slug?: string;
        dimensions_attributes?: { name: string; entry_value: string }[];
      };
    },
  ) {
    const ds = await this.datasourcesService.updateDatasource(BigInt(id), spaceId, body.datasource);
    return { datasource: ds };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.datasourcesService.deleteDatasource(BigInt(id), spaceId);
    return {};
  }
}
