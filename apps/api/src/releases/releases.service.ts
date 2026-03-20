import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { releases } from '../db/schema';

@Injectable()
export class ReleasesService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(releases)
      .where(eq(releases.spaceId, spaceId))
      .orderBy(desc(releases.createdAt));

    return { releases: rows.map((r) => this.format(r)) };
  }

  async findOne(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(releases)
      .where(eq(releases.id, id))
      .limit(1);

    if (!row || row.spaceId !== spaceId) return null;
    return { release: this.format(row) };
  }

  private format(r: typeof releases.$inferSelect) {
    return {
      id: Number(r.id),
      name: r.name,
      uuid: r.uuid,
      space_id: r.spaceId,
      release_at: r.releaseAt ?? null,
      released: r.released,
      timezone: r.timezone ?? 'UTC',
      branches_to_deploy: r.branchesToDeploy,
      owner_id: r.ownerId ? Number(r.ownerId) : null,
      users_to_notify_ids: r.usersToNotifyIds,
      public: r.public,
      allowed_user_ids: r.allowedUserIds,
      allowed_space_role_ids: r.allowedSpaceRoleIds,
      allowed_api_key_ids: r.allowedApiKeyIds,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }
}
