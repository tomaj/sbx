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
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { DatasourcesService } from './datasources.service';

@Controller('v1/spaces/:spaceId/datasources')
@UseGuards(SessionOrTokenGuard)
export class DatasourcesMapiController {
  constructor(private readonly datasourcesService: DatasourcesService) {}

  @Get()
  list(@Param('spaceId') spaceId: string) {
    return this.datasourcesService.findAll(parseInt(spaceId));
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
    @Body() body: { datasource: { name: string; slug: string } },
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
    @Body() body: { datasource: { name?: string; slug?: string } },
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
