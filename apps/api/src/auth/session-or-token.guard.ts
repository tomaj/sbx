import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { apiTokens, spaces, users } from '../db/schema';

/**
 * Accepts either:
 *  1. A management API token via ?token= query param (same as TokenGuard)
 *  2. A better-auth session token via Authorization: Bearer header
 *
 * In both cases sets req.space so MAPI controllers work unchanged.
 */
@Injectable()
export class SessionOrTokenGuard implements CanActivate {
  constructor(@Inject(DB) private db: DbType) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // ── 1. Try management token ─────────────────────────────────────────────
    const queryToken: string | undefined = req.query.token;
    if (queryToken) {
      const rows = await this.db
        .select()
        .from(apiTokens)
        .innerJoin(spaces, eq(apiTokens.spaceId, spaces.id))
        .where(eq(apiTokens.token, queryToken))
        .limit(1);

      if (!rows.length) throw new UnauthorizedException('Invalid token');

      req.apiToken = rows[0].api_tokens;
      req.space = rows[0].spaces;
      return true;
    }

    // ── 2. Try session token ────────────────────────────────────────────────
    const authHeader: string = req.headers['authorization'];
    let sessionToken: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.slice(7);
    } else {
      const cookieHeader: string = req.headers['cookie'] ?? '';
      const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
      if (match) sessionToken = decodeURIComponent(match[1]);
    }

    if (!sessionToken) throw new UnauthorizedException('No token provided');

    const rawToken = sessionToken.split('.')[0];

    const sessionResult = await this.db.execute(
      sql`SELECT s."userId", u.email, u.name
          FROM session s
          JOIN "user" u ON s."userId" = u.id
          WHERE s.token = ${rawToken} AND s."expiresAt" > NOW()
          LIMIT 1`,
    );

    if (!sessionResult.rows.length)
      throw new UnauthorizedException('Invalid or expired session');

    req.adminUser = sessionResult.rows[0];

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
