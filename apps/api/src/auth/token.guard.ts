import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { apiTokens, spaces } from '../db/schema';

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(@Inject(DB) private db: DbType) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token: string = req.query.token;

    if (!token) throw new UnauthorizedException('No token provided');

    const rows = await this.db
      .select()
      .from(apiTokens)
      .innerJoin(spaces, eq(apiTokens.spaceId, spaces.id))
      .where(eq(apiTokens.token, token))
      .limit(1);

    if (!rows.length) throw new UnauthorizedException('Invalid token');

    req.apiToken = rows[0].api_tokens;
    req.space = rows[0].spaces;
    return true;
  }
}
