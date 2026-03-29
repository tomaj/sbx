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
  list(
    @Param('spaceId') spaceId: string,
    @Query('datasource_id') datasourceId?: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
  ) {
    return this.datasourcesService.findAllEntries(
      parseInt(spaceId),
      datasourceId ? parseInt(datasourceId) : undefined,
      Math.max(1, parseInt(page) || 1),
      Math.min(100, parseInt(perPage) || 25),
    );
  }

  @Get(':id')
  async getOne(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Query('datasource_id') datasourceId?: string,
  ) {
    // To verify space ownership we need datasource_id; if not provided we
    // do a best-effort lookup by joining via the service's findAllEntries.
    // For the single-entry lookup we use findEntry with the datasource scope.
    if (datasourceId) {
      const result = await this.datasourcesService.findEntry(
        parseInt(id),
        parseInt(datasourceId),
      );
      if (!result) throw new NotFoundException('Datasource entry not found');
      return result;
    }
    // Without datasource_id, look up through space-scoped findAllEntries to
    // get the datasource_id, then re-query via findEntry.
    const all = await this.datasourcesService.findAllEntries(
      parseInt(spaceId),
      undefined,
      1,
      1000,
    );
    const entry = all.datasource_entries.find((e) => e.id === parseInt(id));
    if (!entry) throw new NotFoundException('Datasource entry not found');
    return {
      datasource_entry: entry,
    };
  }

  @Post()
  @HttpCode(201)
  async create(
    @Param('spaceId') spaceId: string,
    @Body()
    body: {
      datasource_entry: { name: string; value: string; datasource_id: number };
    },
  ) {
    // Verify the datasource belongs to the space before creating the entry.
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
      },
    );
    const full = await this.datasourcesService.findEntry(
      entry.id,
      body.datasource_entry.datasource_id,
    );
    return full ?? {
      datasource_entry: {
        id: entry.id,
        name: entry.name,
        value: entry.value,
        datasource_id: body.datasource_entry.datasource_id,
        dimension_value: null,
        created_at: null,
        updated_at: null,
      },
    };
  }

  @Put(':id')
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body()
    body: {
      datasource_entry: { name?: string; value?: string; datasource_id?: number };
    },
  ) {
    // Resolve datasource_id: from body or by looking up via space.
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

    await this.datasourcesService.updateEntry(
      BigInt(id),
      BigInt(datasourceId),
      {
        name: body.datasource_entry.name,
        value: body.datasource_entry.value,
      },
    );
    const full = await this.datasourcesService.findEntry(parseInt(id), datasourceId);
    if (!full) throw new NotFoundException('Datasource entry not found');
    return full;
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Query('datasource_id') datasourceId?: string,
  ) {
    let dsId: number | undefined = datasourceId
      ? parseInt(datasourceId)
      : undefined;

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
