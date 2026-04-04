import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { WebhooksService } from './webhooks.service';
import { ALL_WEBHOOK_ACTIONS } from './webhook-actions';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Webhooks - MAPI')
@Controller('v1/spaces/:spaceId/webhook_endpoints')
@Auth('session-or-token')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('logs')
  listLogs(
    @Req() req: any,
    @Query('webhook_id') webhookId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    return this.webhooksService.listLogs(req.space.id, {
      webhookId: webhookId ? parseInt(webhookId) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page) : undefined,
      perPage: perPage ? parseInt(perPage) : undefined,
    });
  }

  @Get('logs/:logId')
  async getLog(@Req() req: any, @Param('logId') logId: string) {
    return ResultGuard.throwIfNotFound(await this.webhooksService.getLog(req.space.id, parseInt(logId)));
  }

  @Post('logs/:logId/retry')
  async retryLog(@Req() req: any, @Param('logId') logId: string) {
    return ResultGuard.throwIfNotFound(await this.webhooksService.retryLog(req.space.id, parseInt(logId)));
  }

  @Get('actions')
  getActions() {
    return { actions: ALL_WEBHOOK_ACTIONS };
  }

  @Get()
  async getWebhooks(@Req() req: any) {
    return this.webhooksService.findAll(req.space.id);
  }

  @Get(':id')
  async getWebhook(@Req() req: any, @Param('id') id: string) {
    return ResultGuard.throwIfNotFound(await this.webhooksService.findOne(req.space.id, parseInt(id)));
  }

  @Post()
  @HttpCode(201)
  async createWebhook(
    @Req() req: any,
    @Body()
    body: {
      webhook_endpoint: {
        name: string;
        endpoint: string;
        description?: string;
        secret?: string;
        actions?: string[];
        activated?: boolean;
      };
    },
  ) {
    const data = body.webhook_endpoint;
    const result = await this.webhooksService.adminCreate(req.space.id, {
      name: data.name,
      endpoint: data.endpoint,
      description: data.description,
      secret: data.secret,
      actions: data.actions ?? [],
      activated: data.activated,
    });
    return { webhook_endpoint: result.webhook };
  }

  @Put(':id')
  async updateWebhook(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      webhook_endpoint: {
        name?: string;
        endpoint?: string;
        description?: string | null;
        secret?: string | null;
        actions?: string[];
        activated?: boolean;
      };
    },
  ) {
    return { webhook_endpoint: ResultGuard.throwIfNotFound(
      await this.webhooksService.adminUpdate(req.space.id, parseInt(id), body.webhook_endpoint),
    ).webhook };
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteWebhook(@Req() req: any, @Param('id') id: string) {
    await this.webhooksService.adminDelete(req.space.id, parseInt(id));
  }
}
