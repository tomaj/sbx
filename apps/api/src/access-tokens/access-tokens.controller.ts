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
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { AccessTokensService } from './access-tokens.service';

@Controller('v1/spaces/:spaceId/api_keys')
@UseGuards(SessionOrTokenGuard)
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

  @Post()
  @HttpCode(201)
  async createApiKey(
    @Req() req: any,
    @Body() body: {
      api_key: {
        name?: string;
        token_type?: 'public' | 'private' | 'management';
        branch_id?: number | null;
        min_cache?: number | null;
      };
    },
  ) {
    const access = (body.api_key?.token_type ?? 'public') as 'public' | 'private';
    return this.accessTokensService.adminCreate(req.space.id, {
      name: body.api_key?.name,
      access,
      branchId: body.api_key?.branch_id,
      minCache: body.api_key?.min_cache ?? undefined,
    });
  }

  @Put(':id')
  async updateApiKey(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: {
      api_key: {
        name?: string;
        token_type?: 'public' | 'private';
        branch_id?: number | null;
        min_cache?: number | null;
      };
    },
  ) {
    const result = await this.accessTokensService.adminUpdate(
      req.space.id,
      parseInt(id),
      {
        name: body.api_key?.name,
        access: body.api_key?.token_type,
        branchId: body.api_key?.branch_id,
        minCache: body.api_key?.min_cache ?? undefined,
      },
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteApiKey(@Req() req: any, @Param('id') id: string) {
    await this.accessTokensService.adminDelete(req.space.id, parseInt(id));
    return {};
  }
}
