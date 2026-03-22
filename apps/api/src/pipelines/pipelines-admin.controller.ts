import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { PipelinesService } from './pipelines.service';

@Controller('v1/admin/spaces/:spaceId/pipelines')
@UseGuards(SessionGuard)
export class PipelinesAdminController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get()
  list(@Param('spaceId') spaceId: string) {
    return this.pipelinesService.list(parseInt(spaceId));
  }

  @Post()
  create(
    @Param('spaceId') spaceId: string,
    @Body() body: { name: string; preview_url?: string; source_of_sync?: string },
  ) {
    return this.pipelinesService.create(parseInt(spaceId), body);
  }

  @Patch(':id')
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; preview_url?: string; source_of_sync?: string },
  ) {
    const result = await this.pipelinesService.update(parseInt(spaceId), parseInt(id), body);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  async remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    const result = await this.pipelinesService.remove(parseInt(spaceId), parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }
}
