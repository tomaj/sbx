import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
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
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { WebhooksService } from './webhooks.service';
import { ALL_WEBHOOK_ACTIONS } from './webhook-actions';
import { ResultGuard } from '../shared/result-guard.util';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Webhooks - MAPI')
@Controller('v1/spaces/:spaceId/webhook_endpoints')
@Auth('session-or-token')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('logs')
  listLogs(
    @Req() req: AuthenticatedRequest,
    @Query('webhook_id') webhookId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    return this.webhooksService.listLogs(req.space.id, {
      webhookId: QueryParserUtil.parseOptionalInt(webhookId),
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: QueryParserUtil.parseOptionalInt(page),
      perPage: QueryParserUtil.parseOptionalInt(perPage),
    });
  }

  @Get('logs/:logId')
  async getLog(@Req() req: AuthenticatedRequest, @Param('logId', ParseIntPipe) logId: number) {
    return ResultGuard.throwIfNotFound(await this.webhooksService.getLog(req.space.id, logId));
  }

  @Post('logs/:logId/retry')
  async retryLog(@Req() req: AuthenticatedRequest, @Param('logId', ParseIntPipe) logId: number) {
    return ResultGuard.throwIfNotFound(await this.webhooksService.retryLog(req.space.id, logId));
  }

  @Get('actions')
  getActions() {
    return { actions: ALL_WEBHOOK_ACTIONS };
  }

  @Get()
  async getWebhooks(@Req() req: AuthenticatedRequest) {
    return this.webhooksService.findAll(req.space.id);
  }

  @Get(':id')
  async getWebhook(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(await this.webhooksService.findOne(req.space.id, id));
  }

  @Post()
  @HttpCode(201)
  async createWebhook(
    @Req() req: AuthenticatedRequest,
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
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
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
    return {
      webhook_endpoint: ResultGuard.throwIfNotFound(
        await this.webhooksService.adminUpdate(req.space.id, id, body.webhook_endpoint),
      ).webhook,
    };
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteWebhook(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    await this.webhooksService.adminDelete(req.space.id, id);
    return {};
  }
}
