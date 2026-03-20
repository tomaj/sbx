import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { AccessTokensService } from './access-tokens.service';

@Controller('v1/spaces/:spaceId/api_keys')
@UseGuards(TokenGuard)
export class AccessTokensController {
  constructor(private readonly accessTokensService: AccessTokensService) {}

  @Get()
  async getApiKeys(@Req() req: any) {
    return this.accessTokensService.findAll(req.space.id);
  }

  @Get(':id')
  async getApiKey(@Req() req: any, @Param('id') id: string) {
    const result = await this.accessTokensService.findOne(
      req.space.id,
      parseInt(id),
    );
    if (!result) throw new NotFoundException();
    return result;
  }
}
