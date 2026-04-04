import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { UnifiedAuthGuard } from './unified-auth.guard';

export type AuthStrategy = 'session' | 'token' | 'session-or-token';

export const AUTH_STRATEGIES = 'auth:strategies';

/**
 * Unified auth decorator. Replaces @UseGuards(SessionGuard), @UseGuards(TokenGuard), etc.
 *
 * Usage:
 *   @Auth('session')           // only session/cookie auth (admin endpoints)
 *   @Auth('token')             // only API token auth (CDN endpoints)
 *   @Auth('session-or-token')  // accepts either (MAPI endpoints)
 */
export function Auth(...strategies: AuthStrategy[]) {
  return applyDecorators(
    SetMetadata(AUTH_STRATEGIES, strategies),
    UseGuards(UnifiedAuthGuard),
  );
}
