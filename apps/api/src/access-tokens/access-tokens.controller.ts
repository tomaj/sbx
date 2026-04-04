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
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { AccessTokensService } from './access-tokens.service';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Access Tokens - MAPI')
@Controller('v1/spaces/:spaceId/api_keys')
@Auth('session-or-token')
export class AccessTokensController {
  constructor(private readonly accessTokensService: AccessTokensService) {}

  @Get()
  async getApiKeys(@Req() req: AuthenticatedRequest) {
    return this.accessTokensService.findAll(req.space.id);
  }

  @Get(':id')
  async getApiKey(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(await this.accessTokensService.findOne(req.space.id, id));
  }

  @Post()
  @HttpCode(201)
  async createApiKey(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      api_key: {
        name?: string;
        access?: 'public' | 'private' | 'theme' | 'release';
        branch_id?: number | null;
        min_cache?: number | null;
      };
    },
  ) {
    const access = (body.api_key?.access ?? 'public') as 'public' | 'private';
    return this.accessTokensService.adminCreate(req.space.id, {
      name: body.api_key?.name,
      access,
      branchId: body.api_key?.branch_id,
      minCache: body.api_key?.min_cache ?? undefined,
    });
  }

  @Put(':id')
  async updateApiKey(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      api_key: {
        name?: string;
        access?: 'public' | 'private' | 'theme' | 'release';
        branch_id?: number | null;
        min_cache?: number | null;
      };
    },
  ) {
    return ResultGuard.throwIfNotFound(
      await this.accessTokensService.adminUpdate(req.space.id, id, {
        name: body.api_key?.name,
        access: body.api_key?.access as 'public' | 'private' | undefined,
        branchId: body.api_key?.branch_id,
        minCache: body.api_key?.min_cache ?? undefined,
      }),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteApiKey(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(
      await this.accessTokensService.adminDelete(req.space.id, id),
    );
  }
}
