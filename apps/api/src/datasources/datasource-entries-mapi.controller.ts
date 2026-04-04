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
import { ResultGuard } from '../shared/result-guard.util';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { DatasourcesService } from './datasources.service';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Datasource Entries - MAPI')
@Controller('v1/spaces/:spaceId/datasource_entries')
@Auth('session-or-token')
export class DatasourceEntriesMapiController {
  constructor(private readonly datasourcesService: DatasourcesService) {}

  @Get()
  async list(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('datasource_id') datasourceId?: string,
    @Query('datasource_slug') _datasourceSlug?: string,
    @Query('dimension') dimensionId?: string, // numeric ID of dimension
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('search') search?: string,
  ) {
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(
      page,
      perPage,
    );
    const pageNum = parsedPage;
    const perPageNum = Math.min(1000, parsedPerPage);

    // Resolve dimension entry_value from numeric dimension ID
    let dimensionEntryValue: string | undefined;
    if (dimensionId && datasourceId) {
      const ds = await this.datasourcesService.findOne(
        spaceId,
        QueryParserUtil.parseOptionalInt(datasourceId) ?? 0,
      );
      if (ds) {
        const dim = (ds.datasource.dimensions as any[]).find(
          (d: any) => String(d.id) === dimensionId,
        );
        if (dim) dimensionEntryValue = dim.entry_value;
      }
    }

    return this.datasourcesService.findAllEntries(
      spaceId,
      QueryParserUtil.parseOptionalInt(datasourceId),
      pageNum,
      perPageNum,
      { search, dimensionEntryValue },
    );
  }

  @Get(':id')
  async getOne(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('datasource_id') datasourceId?: string,
  ) {
    if (datasourceId) {
      const result = await this.datasourcesService.findEntry(
        id,
        QueryParserUtil.parseOptionalInt(datasourceId) ?? 0,
      );
      ResultGuard.throwIfNotFound(result, 'Datasource entry not found');
      return result;
    }
    const all = await this.datasourcesService.findAllEntries(spaceId, undefined, 1, 1000);
    const entry = all.datasource_entries.find((e) => e.id === id);
    ResultGuard.throwIfNotFound(entry, 'Datasource entry not found');
    return { datasource_entry: entry };
  }

  @Post()
  @HttpCode(201)
  async create(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Body()
    body: {
      datasource_entry: {
        name: string;
        value: string;
        datasource_id: number;
        position?: number;
      };
    },
  ) {
    const ds = await this.datasourcesService.findOne(spaceId, body.datasource_entry.datasource_id);
    ResultGuard.throwIfNotFound(ds, 'Datasource not found');

    const entry = await this.datasourcesService.createEntry(
      BigInt(body.datasource_entry.datasource_id),
      {
        name: body.datasource_entry.name,
        value: body.datasource_entry.value,
        position: body.datasource_entry.position,
      },
    );
    return { datasource_entry: entry };
  }

  @Put(':id')
  async update(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      datasource_entry: {
        name?: string;
        value?: string;
        position?: number;
        dimension_value?: string;
        datasource_id?: number;
      };
      dimension_id?: number; // root-level, required when updating dimension_value
    },
  ) {
    // Resolve datasource_id
    let datasourceId: number | undefined = body.datasource_entry.datasource_id;
    if (!datasourceId) {
      const all = await this.datasourcesService.findAllEntries(spaceId, undefined, 1, 1000);
      const found = ResultGuard.throwIfNotFound(
        all.datasource_entries.find((e) => e.id === id),
        'Datasource entry not found',
      );
      datasourceId = found.datasource_id;
    }

    // Resolve dimension entry_value from dimension_id
    let dimensionEntryValue: string | undefined;
    if (body.dimension_id && body.datasource_entry.dimension_value !== undefined) {
      const ds = await this.datasourcesService.findOne(spaceId, datasourceId);
      if (ds) {
        const dim = (ds.datasource.dimensions as any[]).find(
          (d: any) => d.id === body.dimension_id,
        );
        if (dim) dimensionEntryValue = dim.entry_value;
      }
    }

    const entry = await this.datasourcesService.updateEntry(BigInt(id), BigInt(datasourceId), {
      name: body.datasource_entry.name,
      value: body.datasource_entry.value,
      position: body.datasource_entry.position,
      dimension_value: body.datasource_entry.dimension_value,
      dimension_entry_value: dimensionEntryValue,
    });
    const full = await this.datasourcesService.findEntry(id, datasourceId);
    return full ?? { datasource_entry: entry };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('datasource_id') datasourceId?: string,
  ) {
    let dsId: number | undefined = QueryParserUtil.parseOptionalInt(datasourceId);

    if (!dsId) {
      const all = await this.datasourcesService.findAllEntries(spaceId, undefined, 1, 1000);
      const found = ResultGuard.throwIfNotFound(
        all.datasource_entries.find((e) => e.id === id),
        'Datasource entry not found',
      );
      dsId = found.datasource_id;
    }

    await this.datasourcesService.deleteEntry(BigInt(id), BigInt(dsId));
    return {};
  }
}
