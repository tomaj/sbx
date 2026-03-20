import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { apiTokens } from '../db/schema';

@Injectable()
export class AccessTokensService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.spaceId, spaceId))
      .orderBy(asc(apiTokens.id));

    return { api_keys: rows.map(this.format) };
  }

  async findOne(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(apiTokens)
      .where(and(eq(apiTokens.spaceId, spaceId), eq(apiTokens.id, id)))
      .limit(1);

    if (!row) return null;
    return { api_key: this.format(row) };
  }

  private format(t: typeof apiTokens.$inferSelect) {
    return {
      id: Number(t.id),
      access: t.tokenType,
      branch_id: t.branchId != null ? Number(t.branchId) : null,
      name: t.name,
      space_id: t.spaceId,
      token: t.token,
      story_ids: t.storyIds ?? [],
      min_cache: t.minCache,
      release_ids: t.releaseIds ?? [],
    };
  }
}
