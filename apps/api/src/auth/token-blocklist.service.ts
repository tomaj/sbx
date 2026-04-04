import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';

/** Manages JWT revocation via Redis.
 *
 * Strategy: "revoked_before" per user — stores the unix timestamp at which
 * all tokens for a given user were invalidated. Any token issued at or before
 * that timestamp is considered revoked.
 *
 * This allows O(1) revocation of all sessions for a user (e.g. logout,
 * password change, account disable) without storing individual token IDs.
 */
@Injectable()
export class TokenBlocklistService {
  constructor(@Inject(REDIS) private redis: Redis) {}

  /**
   * Revoke all tokens for a user issued at or before the current timestamp.
   * @param userId    The user's numeric ID
   * @param ttlSeconds  How long to keep the record in Redis (default: 7 days,
   *                    matching the JWT expiry, so the entry auto-cleans itself)
   */
  async revokeUser(userId: number, ttlSeconds = 7 * 24 * 3600): Promise<void> {
    const key = `jwt:revoked_before:${userId}`;
    const now = Math.floor(Date.now() / 1000);
    await this.redis.set(key, String(now), 'EX', ttlSeconds);
  }

  /**
   * Returns true if the token is revoked.
   * @param userId  The user's numeric ID (from JWT payload.sub)
   * @param iat     The token's issued-at timestamp (from JWT payload.iat)
   */
  async isRevoked(userId: number, iat: number): Promise<boolean> {
    const key = `jwt:revoked_before:${userId}`;
    const revokedBefore = await this.redis.get(key);
    if (!revokedBefore) return false;
    return iat <= parseInt(revokedBefore, 10);
  }
}
