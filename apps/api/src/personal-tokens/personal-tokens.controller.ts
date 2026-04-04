import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { PersonalTokensService } from './personal-tokens.service';

@ApiTags('Personal Tokens - Admin')
@Controller('v1/admin/me/tokens')
@Auth('session')
export class PersonalTokensController {
  constructor(private readonly service: PersonalTokensService) {}

  @Get()
  getTokens(@Req() req: any) {
    return this.service.getTokens(req.adminUser.userId);
  }

  @Post()
  createToken(@Req() req: any, @Body() body: { name: string; expiresInDays?: number }) {
    return this.service.createToken(req.adminUser.userId, body.name, body.expiresInDays);
  }

  @Patch(':id')
  updateToken(@Req() req: any, @Param('id') id: string, @Body() body: { name: string }) {
    return this.service.updateToken(req.adminUser.userId, parseInt(id), body.name);
  }

  @Delete(':id')
  deleteToken(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteToken(req.adminUser.userId, parseInt(id));
  }
}
