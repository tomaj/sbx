import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { DatasourcesService } from './datasources.service';

@Controller('v1/admin/spaces/:spaceId/datasources')
@UseGuards(SessionGuard)
export class DatasourcesAdminController {
  constructor(private readonly datasourcesService: DatasourcesService) {}

  @Get()
  list(
    @Param('spaceId') spaceId: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('search') search?: string,
    @Query('sort_field') sortField?: string,
    @Query('sort_dir') sortDir?: string,
  ) {
    return this.datasourcesService.listDatasourcesAdmin(parseInt(spaceId), {
      page: Math.max(1, parseInt(page) || 1),
      perPage: Math.min(100, parseInt(perPage) || 25),
      search,
      sortField,
      sortDir: sortDir === 'desc' ? 'desc' : 'asc',
    });
  }

  @Post()
  create(
    @Param('spaceId') spaceId: string,
    @Body() body: { name: string; slug: string },
  ) {
    return this.datasourcesService.createDatasource(parseInt(spaceId), body);
  }

  @Patch(':id')
  update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; slug?: string },
  ) {
    return this.datasourcesService.updateDatasource(
      BigInt(id),
      parseInt(spaceId),
      body,
    );
  }

  @Delete(':id')
  remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return this.datasourcesService.deleteDatasource(
      BigInt(id),
      parseInt(spaceId),
    );
  }

  @Get(':id/entries')
  listEntries(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('search') search?: string,
  ) {
    return this.datasourcesService.listEntriesAdmin(
      BigInt(id),
      parseInt(spaceId),
      {
        page: Math.max(1, parseInt(page) || 1),
        perPage: Math.min(100, parseInt(perPage) || 25),
        search,
      },
    );
  }

  @Post(':id/entries')
  createEntry(
    @Param('id') id: string,
    @Body() body: { name: string; value: string },
  ) {
    return this.datasourcesService.createEntry(BigInt(id), body);
  }

  // Must be declared before :entryId to take routing precedence
  @Patch(':id/entries/reorder')
  reorderEntries(
    @Param('id') id: string,
    @Body() body: { ids: number[] },
  ) {
    return this.datasourcesService.reorderEntries(BigInt(id), body.ids);
  }

  @Patch(':id/entries/:entryId')
  updateEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() body: { name?: string; value?: string },
  ) {
    return this.datasourcesService.updateEntry(
      BigInt(entryId),
      BigInt(id),
      body,
    );
  }

  @Delete(':id/entries/:entryId')
  deleteEntry(@Param('id') id: string, @Param('entryId') entryId: string) {
    return this.datasourcesService.deleteEntry(BigInt(entryId), BigInt(id));
  }
}
