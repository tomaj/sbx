import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { PipelinesService } from './pipelines.service';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Pipelines - Admin')
@Controller('v1/admin/spaces/:spaceId/pipelines')
@Auth('session')
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
    return ResultGuard.throwIfNotFound(
      await this.pipelinesService.update(parseInt(spaceId), parseInt(id), body),
    );
  }

  @Delete(':id')
  async remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return ResultGuard.throwIfNotFound(
      await this.pipelinesService.remove(parseInt(spaceId), parseInt(id)),
    );
  }
}
