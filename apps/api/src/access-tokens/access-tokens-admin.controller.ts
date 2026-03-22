import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { AccessTokensService } from './access-tokens.service';

@Controller('v1/admin/spaces/:spaceId/access-tokens')
@UseGuards(SessionGuard)
export class AccessTokensAdminController {
  constructor(private readonly accessTokensService: AccessTokensService) {}

  @Get()
  list(@Param('spaceId') spaceId: string) {
    return this.accessTokensService.adminList(parseInt(spaceId));
  }

  @Post()
  create(
    @Param('spaceId') spaceId: string,
    @Body() body: { name?: string; access: 'public' | 'private'; branchId?: number | null; minCache?: number },
  ) {
    return this.accessTokensService.adminCreate(parseInt(spaceId), body);
  }

  @Patch(':id')
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; access?: 'public' | 'private'; branchId?: number | null; minCache?: number },
  ) {
    const result = await this.accessTokensService.adminUpdate(parseInt(spaceId), parseInt(id), body);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return this.accessTokensService.adminDelete(parseInt(spaceId), parseInt(id));
  }
}
