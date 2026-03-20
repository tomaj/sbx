import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { activities } from '../db/schema';

@Injectable()
export class ActivitiesService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAllAdmin(
    spaceId: number,
    page: number,
    perPage: number,
    opts: {
      userIds?: number[];
      keys?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
  ) {
    const where = and(
      eq(activities.spaceId, spaceId),
      opts.userIds?.length ? inArray(activities.ownerId, opts.userIds.map(BigInt)) : undefined,
      opts.keys?.length ? inArray(activities.key, opts.keys) : undefined,
      opts.dateFrom ? gte(activities.createdAt, opts.dateFrom) : undefined,
      opts.dateTo ? lte(activities.createdAt, opts.dateTo) : undefined,
    );

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
        activity: {
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
        },
        trackable: a.trackable,
        user: a.user,
      })),
      total: Number(countResult[0].count),
      page,
      perPage,
    };
  }

  async findAll(spaceId: number, page: number, perPage: number) {
    const rows = await this.db
      .select()
      .from(activities)
      .where(eq(activities.spaceId, spaceId))
      .orderBy(desc(activities.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage);

    return {
      activities: rows.map((a) => ({
        activity: {
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
        },
        trackable: a.trackable,
        user: a.user,
      })),
    };
  }
}
