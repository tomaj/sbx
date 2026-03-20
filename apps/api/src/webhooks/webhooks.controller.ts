import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { WebhooksService } from './webhooks.service';

@Controller('v1/spaces/:spaceId/webhook_endpoints')
@UseGuards(TokenGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  async getWebhooks(@Req() req: any) {
    return this.webhooksService.findAll(req.space.id);
  }

  @Get(':id')
  async getWebhook(@Req() req: any, @Param('id') id: string) {
    const result = await this.webhooksService.findOne(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }
}
