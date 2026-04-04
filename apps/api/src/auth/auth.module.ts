import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { UnifiedAuthGuard } from './unified-auth.guard';
import { TokenBlocklistService } from './token-blocklist.service';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env.schema';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_SECRET,
        signOptions: { expiresIn: '2h', algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, UnifiedAuthGuard, TokenBlocklistService],
  exports: [JwtModule, JwtGuard, UnifiedAuthGuard, TokenBlocklistService],
})
export class AuthModule {}
