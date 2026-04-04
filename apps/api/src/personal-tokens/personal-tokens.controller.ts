import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { PersonalTokensService } from './personal-tokens.service';

@ApiTags('Personal Tokens - Admin')
@Controller('v1/admin/me/tokens')
@Auth('session')
export class PersonalTokensController {
  constructor(private readonly service: PersonalTokensService) {}

  @Get()
  getTokens(@Req() req: AuthenticatedRequest) {
    return this.service.getTokens(req.adminUser.sbxUserId!);
  }

  @Post()
  @HttpCode(201)
  createToken(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; expiresInDays?: number },
  ) {
    return this.service.createToken(req.adminUser.sbxUserId!, body.name, body.expiresInDays);
  }

  @Patch(':id')
  updateToken(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string },
  ) {
    return this.service.updateToken(req.adminUser.sbxUserId!, id, body.name);
  }

  @Delete(':id')
  deleteToken(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.service.deleteToken(req.adminUser.sbxUserId!, id);
  }
}
