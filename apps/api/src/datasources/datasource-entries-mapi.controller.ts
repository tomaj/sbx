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
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { DatasourcesService } from './datasources.service';

@Controller('v1/spaces/:spaceId/datasource_entries')
@UseGuards(SessionOrTokenGuard)
export class DatasourceEntriesMapiController {
  constructor(private readonly datasourcesService: DatasourcesService) {}

  @Get()
  async list(
    @Param('spaceId') spaceId: string,
    @Query('datasource_id') datasourceId?: string,
    @Query('datasource_slug') datasourceSlug?: string,
    @Query('dimension') dimensionId?: string,   // numeric ID of dimension
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('search') search?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const perPageNum = Math.min(1000, parseInt(perPage) || 25);

    // Resolve dimension entry_value from numeric dimension ID
    let dimensionEntryValue: string | undefined;
    if (dimensionId && datasourceId) {
      const ds = await this.datasourcesService.findOne(parseInt(spaceId), parseInt(datasourceId));
      if (ds) {
        const dim = (ds.datasource.dimensions as any[]).find(
          (d: any) => String(d.id) === dimensionId,
        );
        if (dim) dimensionEntryValue = dim.entry_value;
      }
    }

    return this.datasourcesService.findAllEntries(
      parseInt(spaceId),
      datasourceId ? parseInt(datasourceId) : undefined,
      pageNum,
      perPageNum,
      { search, dimensionEntryValue },
    );
  }

  @Get(':id')
  async getOne(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Query('datasource_id') datasourceId?: string,
  ) {
    if (datasourceId) {
      const result = await this.datasourcesService.findEntry(
        parseInt(id),
        parseInt(datasourceId),
      );
      if (!result) throw new NotFoundException('Datasource entry not found');
      return result;
    }
    const all = await this.datasourcesService.findAllEntries(
      parseInt(spaceId),
      undefined,
      1,
      1000,
    );
    const entry = all.datasource_entries.find((e) => e.id === parseInt(id));
    if (!entry) throw new NotFoundException('Datasource entry not found');
    return { datasource_entry: entry };
  }

  @Post()
  @HttpCode(201)
  async create(
    @Param('spaceId') spaceId: string,
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
    const ds = await this.datasourcesService.findOne(
      parseInt(spaceId),
      body.datasource_entry.datasource_id,
    );
    if (!ds) throw new NotFoundException('Datasource not found');

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
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body()
    body: {
      datasource_entry: {
        name?: string;
        value?: string;
        position?: number;
        dimension_value?: string;
        datasource_id?: number;
      };
      dimension_id?: number;   // root-level, required when updating dimension_value
    },
  ) {
    // Resolve datasource_id
    let datasourceId: number | undefined = body.datasource_entry.datasource_id;
    if (!datasourceId) {
      const all = await this.datasourcesService.findAllEntries(
        parseInt(spaceId),
        undefined,
        1,
        1000,
      );
      const found = all.datasource_entries.find((e) => e.id === parseInt(id));
      if (!found) throw new NotFoundException('Datasource entry not found');
      datasourceId = found.datasource_id;
    }

    // Resolve dimension entry_value from dimension_id
    let dimensionEntryValue: string | undefined;
    if (body.dimension_id && body.datasource_entry.dimension_value !== undefined) {
      const ds = await this.datasourcesService.findOne(parseInt(spaceId), datasourceId);
      if (ds) {
        const dim = (ds.datasource.dimensions as any[]).find(
          (d: any) => d.id === body.dimension_id,
        );
        if (dim) dimensionEntryValue = dim.entry_value;
      }
    }

    const entry = await this.datasourcesService.updateEntry(
      BigInt(id),
      BigInt(datasourceId),
      {
        name: body.datasource_entry.name,
        value: body.datasource_entry.value,
        position: body.datasource_entry.position,
        dimension_value: body.datasource_entry.dimension_value,
        dimension_entry_value: dimensionEntryValue,
      },
    );
    const full = await this.datasourcesService.findEntry(parseInt(id), datasourceId);
    return full ?? { datasource_entry: entry };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Query('datasource_id') datasourceId?: string,
  ) {
    let dsId: number | undefined = datasourceId ? parseInt(datasourceId) : undefined;

    if (!dsId) {
      const all = await this.datasourcesService.findAllEntries(
        parseInt(spaceId),
        undefined,
        1,
        1000,
      );
      const found = all.datasource_entries.find((e) => e.id === parseInt(id));
      if (!found) throw new NotFoundException('Datasource entry not found');
      dsId = found.datasource_id;
    }

    await this.datasourcesService.deleteEntry(BigInt(id), BigInt(dsId));
    return {};
  }
}
