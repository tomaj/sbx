import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq, sql } from 'drizzle-orm';
import { timingSafeEqual } from 'crypto';
import { AUTH_STRATEGIES, AuthStrategy } from './auth.decorator';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { apiTokens, spaces, users } from '../db/schema';

/** Timing-safe string comparison to prevent brute-force via timing side-channel */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(DB) private db: DbType,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const strategies = this.reflector.getAllAndOverride<AuthStrategy[]>(
      AUTH_STRATEGIES,
      [context.getHandler(), context.getClass()],
    ) ?? ['session-or-token'];

    const req = context.switchToHttp().getRequest();

    for (const strategy of strategies) {
      try {
        switch (strategy) {
          case 'session':
            return await this.authenticateSession(req);
          case 'token':
            return await this.authenticateToken(req);
          case 'session-or-token':
            return await this.authenticateSessionOrToken(req);
        }
      } catch {
        // If this strategy failed and there are more to try, continue
        continue;
      }
    }

    throw new UnauthorizedException('No valid authentication provided');
  }

  // ── Shared token extraction ────────────────────────────────────────────────

  /** Extracts a session token from Authorization header or better-auth cookie */
  private extractSessionToken(req: any): string | undefined {
    const authHeader: string = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    const cookieHeader: string = req.headers['cookie'] ?? '';
    const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  /** Validates a session token against the DB and sets req.adminUser */
  private async validateSession(req: any, token: string): Promise<boolean> {
    // better-auth stores token as "<rawToken>.<hmacSignature>" in cookie
    // but the DB only has the raw token part
    const rawToken = token.split('.')[0];

    const result = await this.db.execute(
      sql`SELECT s."userId", u.email, u.name
          FROM session s
          JOIN "user" u ON s."userId" = u.id
          WHERE s.token = ${rawToken} AND s."expiresAt" > NOW()
          LIMIT 1`,
    );

    if (!result.rows.length)
      throw new UnauthorizedException('Invalid or expired session');

    req.adminUser = result.rows[0];
    return true;
  }

  // ── Session strategy ──────────────────────────────────────────────────────

  private async authenticateSession(req: any): Promise<boolean> {
    const token = this.extractSessionToken(req);
    if (!token) throw new UnauthorizedException('No session provided');
    return this.validateSession(req, token);
  }

  // ── Token strategy (from TokenGuard) ──────────────────────────────────────

  private async authenticateToken(req: any): Promise<boolean> {
    const token: string = req.query.token;

    if (!token) throw new UnauthorizedException('No token provided');

    const rows = await this.db
      .select()
      .from(apiTokens)
      .innerJoin(spaces, eq(apiTokens.spaceId, spaces.id))
      .where(eq(apiTokens.token, token))
      .limit(1);

    if (!rows.length || !safeEqual(rows[0].api_tokens.token, token))
      throw new UnauthorizedException('Invalid token');

    req.apiToken = rows[0].api_tokens;
    req.space = rows[0].spaces;
    return true;
  }

  // ── Session-or-token strategy (from SessionOrTokenGuard) ──────────────────

  private async authenticateSessionOrToken(req: any): Promise<boolean> {
    // 1. Try management token
    const queryToken: string | undefined = req.query.token;
    if (queryToken) {
      const rows = await this.db
        .select()
        .from(apiTokens)
        .innerJoin(spaces, eq(apiTokens.spaceId, spaces.id))
        .where(eq(apiTokens.token, queryToken))
        .limit(1);

      if (!rows.length || !safeEqual(rows[0].api_tokens.token, queryToken))
        throw new UnauthorizedException('Invalid token');

      req.apiToken = rows[0].api_tokens;
      req.space = rows[0].spaces;
      return true;
    }

    // 2. Try session token
    const sessionToken = this.extractSessionToken(req);
    if (!sessionToken) throw new UnauthorizedException('No token provided');

    await this.validateSession(req, sessionToken);

    // Resolve our internal users.id (bigint) by email — avoids repeated lookups in controllers
    const [sbxUser] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, req.adminUser.email as string))
      .limit(1);
    req.adminUser.sbxUserId = sbxUser?.id ?? null;

    // Look up the space from the URL params (spaceId or id)
    const spaceId = req.params?.spaceId ?? req.params?.id;
    if (!spaceId) return true; // routes without spaceId param (e.g. GET /v1/spaces) — auth only

    const [space] = await this.db
      .select()
      .from(spaces)
      .where(eq(spaces.id, parseInt(spaceId)))
      .limit(1);

    if (!space) throw new UnauthorizedException('Space not found');

    req.space = space;
    return true;
  }
}
