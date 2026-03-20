import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { activities } from '../db/schema';

@Injectable()
export class ActivitiesService {
  constructor(@Inject(DB) private db: DbType) {}

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
