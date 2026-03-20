import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(DB) private db: DbType) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    let token: string | undefined;

    const authHeader: string = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      const cookieHeader: string = req.headers['cookie'] ?? '';
      const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }

    if (!token) throw new UnauthorizedException('No session provided');

    // better-auth stores token as "<rawToken>.<hmacSignature>" in cookie
    // but the DB only has the raw token part
    const rawToken = token.split('.')[0];

    const result = await this.db.execute(
      sql`SELECT s."userId", u.email, u.name
          FROM session s
          JOIN "user" u ON s."userId" = u.id
          WHERE s.token = ${rawToken} AND s."expiresAt" > NOW()
          LIMIT 1`
    );

    if (!result.rows.length) throw new UnauthorizedException('Invalid or expired session');

    req.adminUser = result.rows[0];
    return true;
  }
}
