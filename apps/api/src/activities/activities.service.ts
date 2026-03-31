import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { activities } from '../db/schema';

interface ActivityFilters {
  createdAtGte?: string;
  createdAtLte?: string;
  byOwnerIds?: number[];
  types?: string[];
}

@Injectable()
export class ActivitiesService {
  constructor(@Inject(DB) private db: DbType) {}

  private buildWhere(spaceId: number, opts: ActivityFilters = {}) {
    return and(
      eq(activities.spaceId, spaceId),
      opts.byOwnerIds?.length
        ? inArray(activities.ownerId, opts.byOwnerIds.map(BigInt))
        : undefined,
      opts.types?.length
        ? inArray(activities.trackableType, opts.types)
        : undefined,
      opts.createdAtGte
        ? gte(activities.createdAt, new Date(opts.createdAtGte))
        : undefined,
      opts.createdAtLte
        ? lte(activities.createdAt, new Date(opts.createdAtLte + 'T23:59:59'))
        : undefined,
    );
  }

  private formatActivity(a: typeof activities.$inferSelect) {
    return {
      id: Number(a.id),
      trackable_id: a.trackableId ? Number(a.trackableId) : null,
      trackable_type: a.trackableType,
      owner_id: a.ownerId ? Number(a.ownerId) : null,
      owner_type: a.ownerType,
      key: a.key,
      parameters: a.parameters,
      recipient_id: a.recipientId ? Number(a.recipientId) : null,
      recipient_type: a.recipientType,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
      space_id: a.spaceId,
    };
  }

  async findAll(
    spaceId: number,
    page: number,
    perPage: number,
    opts: ActivityFilters = {},
  ) {
    const where = this.buildWhere(spaceId, opts);

    const rows = await this.db
      .select()
      .from(activities)
      .where(where)
      .orderBy(desc(activities.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage);

    return {
      activities: rows.map((a) => this.formatActivity(a)),
    };
  }

  async findAllWithMeta(
    spaceId: number,
    page: number,
    perPage: number,
    opts: ActivityFilters = {},
  ) {
    const where = this.buildWhere(spaceId, opts);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(activities)
        .where(where)
        .orderBy(desc(activities.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),
      this.db.select({ count: count() }).from(activities).where(where),
    ]);

    return {
      activities: rows.map((a) => ({
        id: Number(a.id),
        activity: this.formatActivity(a),
        trackable: a.trackable,
        user: a.user,
      })),
      total: Number(countResult[0].count),
      page,
      perPage,
    };
  }

  async findOne(spaceId: number, activityId: number) {
    const [row] = await this.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.spaceId, spaceId),
          eq(activities.id, BigInt(activityId)),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Activity not found');
    }

    return {
      activity: this.formatActivity(row),
      trackable: row.trackable,
      user: row.user,
    };
  }
}
