import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import { and, eq } from 'drizzle-orm';
import { timingSafeEqual } from 'crypto';
import { AUTH_STRATEGIES, type AuthStrategy } from './auth.decorator';
import type { TokenBlocklistService } from './token-blocklist.service';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { apiTokens, spaces, spaceMembers, users } from '../db/schema';
import type { AuthenticatedRequest } from './authenticated-request.interface';

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
    private jwtService: JwtService,
    private tokenBlocklist: TokenBlocklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const strategies = this.reflector.getAllAndOverride<AuthStrategy[]>(AUTH_STRATEGIES, [
      context.getHandler(),
      context.getClass(),
    ]) ?? ['session-or-token'];

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

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
      } catch {}
    }

    throw new UnauthorizedException('No valid authentication provided');
  }

  // ── Shared token extraction ────────────────────────────────────────────────

  /** Extracts a JWT from Authorization: Bearer header or sbx.session cookie */
  private extractSessionToken(req: AuthenticatedRequest): string | undefined {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    const cookieHeader = req.headers.cookie ?? '';
    const match = cookieHeader.match(/sbx\.session=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  /** Validates a JWT session token and populates req.adminUser */
  private async validateSession(req: AuthenticatedRequest, token: string): Promise<boolean> {
    let payload: { sub: number; email: string; iat: number };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // iat must be present and a plausible Unix timestamp (after 2001-09-09)
    if (typeof payload.iat !== 'number' || payload.iat < 1_000_000_000) {
      throw new UnauthorizedException('Invalid token');
    }

    // Check token revocation blocklist (set on logout / account disable)
    if (await this.tokenBlocklist.isRevoked(payload.sub, payload.iat)) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstname: users.firstname,
        lastname: users.lastname,
        disabled: users.disabled,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || user.disabled) {
      throw new UnauthorizedException('User not found or disabled');
    }

    req.adminUser = {
      userId: String(user.id),
      email: user.email,
      name: [user.firstname, user.lastname].filter(Boolean).join(' ') || user.email,
      sbxUserId: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
    };
    return true;
  }

  // ── Session strategy ───────────────────────────────────────────────────────

  private async authenticateSession(req: AuthenticatedRequest): Promise<boolean> {
    const token = this.extractSessionToken(req);
    if (!token) throw new UnauthorizedException('No session provided');
    return this.validateSession(req, token);
  }

  // ── Token strategy ─────────────────────────────────────────────────────────

  private async authenticateToken(req: AuthenticatedRequest): Promise<boolean> {
    const token: string = (req as any).query?.token;
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

  // ── Session-or-token strategy ──────────────────────────────────────────────

  private async authenticateSessionOrToken(req: AuthenticatedRequest): Promise<boolean> {
    // 1. Try management API token from query param
    const queryToken: string | undefined = (req as any).query?.token;
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

    // 2. Try JWT session token
    const sessionToken = this.extractSessionToken(req);
    if (!sessionToken) throw new UnauthorizedException('No token provided');

    await this.validateSession(req, sessionToken);
    // sbxUserId is already set directly from JWT payload.sub — no email lookup needed

    // Look up the space from the URL params (spaceId or id)
    const params = (req as any).params ?? {};
    const spaceId = params.spaceId ?? params.id;
    if (!spaceId) return true; // routes without spaceId param (e.g. GET /v1/spaces)

    const parsedSpaceId = parseInt(spaceId, 10);
    if (Number.isNaN(parsedSpaceId)) throw new UnauthorizedException('Invalid space ID');

    const [space] = await this.db
      .select()
      .from(spaces)
      .where(eq(spaces.id, parsedSpaceId))
      .limit(1);

    if (!space) throw new UnauthorizedException('Space not found');

    // Verify user is a member of this space
    const [membership] = await this.db
      .select({ id: spaceMembers.id })
      .from(spaceMembers)
      .where(
        and(
          eq(spaceMembers.spaceId, parsedSpaceId),
          eq(spaceMembers.userId, req.adminUser!.sbxUserId!),
        ),
      )
      .limit(1);

    if (!membership) throw new UnauthorizedException('Not a member of this space');

    req.space = space;
    return true;
  }
}
