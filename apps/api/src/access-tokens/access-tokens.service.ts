import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
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
    data: {
      name?: string;
      access: 'public' | 'private';
      branchId?: number | null;
      minCache?: number;
    },
  ) {
    const [{ nextId }] = await this.db
      .execute<{ nextId: number }>(sql`SELECT nextval('api_tokens_id_seq')::int AS "nextId"`)
      .then((r) => r.rows as any[]);

    const token = randomBytes(32).toString('base64url');
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
    // Return full token only on creation — subsequent reads return masked version
    return { api_key: this.formatFull(created) };
  }

  async adminUpdate(
    spaceId: number,
    id: number,
    data: {
      name?: string;
      access?: 'public' | 'private';
      branchId?: number | null;
      minCache?: number;
    },
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

  /** Masked format — safe for list/get responses. Full token visible only at creation. */
  private format(t: typeof apiTokens.$inferSelect) {
    const masked = t.token ? `••••••••${t.token.slice(-4)}` : null;
    return {
      id: Number(t.id),
      access: t.tokenType,
      branch_id: t.branchId != null ? Number(t.branchId) : null,
      name: t.name,
      space_id: t.spaceId,
      token: masked,
      story_ids: t.storyIds ?? [],
      min_cache: t.minCache,
      release_ids: t.releaseIds ?? [],
    };
  }

  /** Full format — only used immediately after token creation. */
  private formatFull(t: typeof apiTokens.$inferSelect) {
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
