import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TokenBlocklistService } from './token-blocklist.service';
import { Auth } from './auth.decorator';
import { RateLimit } from '../throttler/throttler.module';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedRequest } from './authenticated-request.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private tokenBlocklist: TokenBlocklistService,
  ) {}

  @RateLimit('auth')
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @RateLimit('auth')
  @Post('refresh')
  @HttpCode(200)
  @Auth('session')
  async refresh(@Req() req: AuthenticatedRequest) {
    return this.authService.refresh(req.adminUser!.sbxUserId!);
  }

  @RateLimit('auth')
  @Post('logout')
  @HttpCode(204)
  @Auth('session')
  async logout(@Req() req: AuthenticatedRequest) {
    if (req.adminUser?.sbxUserId) {
      // Revoke all tokens for this user issued at or before now.
      // Cookie is cleared by the admin Next.js route handler.
      await this.tokenBlocklist.revokeUser(req.adminUser.sbxUserId);
    }
  }
}
