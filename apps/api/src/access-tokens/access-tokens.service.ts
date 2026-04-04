import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
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

  // ─── Admin CRUD ───────────────────────────────────────────────────────────

  async adminList(spaceId: number) {
    const rows = await this.db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.spaceId, spaceId))
      .orderBy(asc(apiTokens.id));
    return { api_keys: rows.map(this.format) };
  }

  async adminCreate(
    spaceId: number,
    data: { name?: string; access: 'public' | 'private'; branchId?: number | null; minCache?: number },
  ) {
    const [{ nextId }] = await this.db.execute<{ nextId: number }>(
      sql`SELECT nextval('api_tokens_id_seq')::int AS "nextId"`,
    ).then(r => r.rows as any[]);

    const token = randomBytes(18).toString('base64url').slice(0, 24);
    const [created] = await this.db
      .insert(apiTokens)
      .values({
        id: nextId,
        spaceId,
        name: data.name ?? null,
        token,
        tokenType: data.access,
        branchId: data.branchId ?? null,
        minCache: data.minCache ?? 0,
      })
      .returning();
    return { api_key: this.format(created) };
  }

  async adminUpdate(
    spaceId: number,
    id: number,
    data: { name?: string; access?: 'public' | 'private'; branchId?: number | null; minCache?: number },
  ) {
    const [updated] = await this.db
      .update(apiTokens)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.access !== undefined && { tokenType: data.access }),
        ...(data.branchId !== undefined && { branchId: data.branchId }),
        ...(data.minCache !== undefined && { minCache: data.minCache }),
      })
      .where(and(eq(apiTokens.id, id), eq(apiTokens.spaceId, spaceId)))
      .returning();
    if (!updated) return null;
    return { api_key: this.format(updated) };
  }

  async adminDelete(spaceId: number, id: number) {
    const [deleted] = await this.db
      .delete(apiTokens)
      .where(and(eq(apiTokens.id, id), eq(apiTokens.spaceId, spaceId)))
      .returning();
    if (!deleted) return null;
    return { api_key: this.format(deleted) };
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
