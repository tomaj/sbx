import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { WebhooksService } from './webhooks.service';

@Controller('v1/admin/spaces/:spaceId/webhooks')
@UseGuards(SessionGuard)
export class WebhooksAdminController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // ─── Logs (must come before :id routes to avoid conflict) ─────────────────

  @Get('logs')
  listLogs(
    @Param('spaceId') spaceId: string,
    @Query('webhook_id') webhookId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    return this.webhooksService.listLogs(parseInt(spaceId), {
      webhookId: webhookId ? parseInt(webhookId) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page) : undefined,
      perPage: perPage ? parseInt(perPage) : undefined,
    });
  }

  @Get('logs/:logId')
  async getLog(@Param('spaceId') spaceId: string, @Param('logId') logId: string) {
    const result = await this.webhooksService.getLog(parseInt(spaceId), parseInt(logId));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post('logs/:logId/retry')
  async retryLog(@Param('spaceId') spaceId: string, @Param('logId') logId: string) {
    const result = await this.webhooksService.retryLog(parseInt(spaceId), parseInt(logId));
    if (!result) throw new NotFoundException();
    return result;
  }

  // ─── Endpoints CRUD ───────────────────────────────────────────────────────

  @Get()
  list(@Param('spaceId') spaceId: string) {
    return this.webhooksService.adminList(parseInt(spaceId));
  }

  @Post()
  create(
    @Param('spaceId') spaceId: string,
    @Body()
    body: {
      name: string;
      endpoint: string;
      description?: string;
      secret?: string;
      actions: string[];
      activated?: boolean;
    },
  ) {
    return this.webhooksService.adminCreate(parseInt(spaceId), body);
  }

  @Patch(':id')
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      endpoint?: string;
      description?: string | null;
      secret?: string | null;
      actions?: string[];
      activated?: boolean;
    },
  ) {
    const result = await this.webhooksService.adminUpdate(parseInt(spaceId), parseInt(id), body);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  async remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return this.webhooksService.adminDelete(parseInt(spaceId), parseInt(id));
  }
}
