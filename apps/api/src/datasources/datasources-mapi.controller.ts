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

@Controller('v1/spaces/:spaceId/datasources')
@UseGuards(SessionOrTokenGuard)
export class DatasourcesMapiController {
  constructor(private readonly datasourcesService: DatasourcesService) {}

  @Get()
  list(
    @Param('spaceId') spaceId: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('sort_by') sortBy?: string,         // format: "name:asc" or "created_at:desc"
    @Query('search') search?: string,
    @Query('by_ids') byIds?: string,
  ) {
    // Parse sort_by="name:asc" format
    const [sortField, sortDir] = (sortBy ?? 'name:asc').split(':');
    const byIdsArr = byIds ? byIds.split(',').map(Number).filter(Boolean) : undefined;

    return this.datasourcesService.listDatasourcesAdmin(parseInt(spaceId), {
      page: Math.max(1, parseInt(page) || 1),
      perPage: Math.min(200, parseInt(perPage) || 25),
      sortField,
      sortDir: sortDir === 'desc' ? 'desc' : 'asc',
      search,
      byIds: byIdsArr,
    });
  }

  @Get(':id')
  async getOne(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    const result = await this.datasourcesService.findOne(
      parseInt(spaceId),
      parseInt(id),
    );
    if (!result) throw new NotFoundException('Datasource not found');
    return result;
  }

  @Post()
  @HttpCode(201)
  async create(
    @Param('spaceId') spaceId: string,
    @Body()
    body: {
      datasource: {
        name: string;
        slug: string;
        dimensions_attributes?: { name: string; entry_value: string }[];
      };
    },
  ) {
    const ds = await this.datasourcesService.createDatasource(
      parseInt(spaceId),
      body.datasource,
    );
    return { datasource: ds };
  }

  @Put(':id')
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body()
    body: {
      datasource: {
        name?: string;
        slug?: string;
        dimensions_attributes?: { name: string; entry_value: string }[];
      };
    },
  ) {
    const ds = await this.datasourcesService.updateDatasource(
      BigInt(id),
      parseInt(spaceId),
      body.datasource,
    );
    return { datasource: ds };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    await this.datasourcesService.deleteDatasource(
      BigInt(id),
      parseInt(spaceId),
    );
    return {};
  }
}
