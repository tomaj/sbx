import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
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
      opts.types?.length ? inArray(activities.trackableType, opts.types) : undefined,
      opts.createdAtGte ? gte(activities.createdAt, new Date(opts.createdAtGte)) : undefined,
      opts.createdAtLte
        ? lte(activities.createdAt, new Date(`${opts.createdAtLte}T23:59:59`))
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

  async findAll(spaceId: number, page: number, perPage: number, opts: ActivityFilters = {}) {
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

  async getStats(spaceId: number, period = 'last_14_days') {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let from: string;
    let to: string = today;
    let groupBy: 'day' | 'month' = 'day';
    let periodLabel: string;

    switch (period) {
      case 'last_7_days':
        from = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
        periodLabel = 'last 7 days';
        break;
      case 'last_month': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        from = lm.toISOString().slice(0, 10);
        to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
        periodLabel = 'last month';
        break;
      }
      case 'last_3_months':
        from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10);
        groupBy = 'month';
        periodLabel = 'last 3 months';
        break;
      case 'last_6_months':
        from = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
        groupBy = 'month';
        periodLabel = 'last 6 months';
        break;
      case 'last_12_months':
        from = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);
        groupBy = 'month';
        periodLabel = 'last 12 months';
        break;
      case 'this_month':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        periodLabel = 'this month';
        break;
      default:
        from = new Date(now.getTime() - 13 * 86400000).toISOString().slice(0, 10);
        periodLabel = 'last 14 days';
        break;
    }

    // Use hardcoded format strings to avoid Drizzle creating separate $N params
    // for GROUP BY vs SELECT which causes PostgreSQL 42803 error
    const bucketExpr =
      groupBy === 'day'
        ? sql<string>`to_char(${activities.createdAt}, 'YYYY-MM-DD')`
        : sql<string>`to_char(${activities.createdAt}, 'YYYY-MM')`;

    const rows = await this.db
      .select({ bucket: bucketExpr, count: count() })
      .from(activities)
      .where(
        and(
          eq(activities.spaceId, spaceId),
          gte(activities.createdAt, new Date(from)),
          lte(activities.createdAt, new Date(`${to}T23:59:59`)),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const map = new Map(rows.map((r) => [r.bucket, Number(r.count)]));

    // Build full date range with zeros filled
    const data: { date: string; count: number }[] = [];
    const end = new Date(`${to}T12:00:00`);
    const cur = new Date(`${from}T12:00:00`);
    while (cur <= end) {
      const key =
        groupBy === 'day'
          ? cur.toISOString().slice(0, 10)
          : `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      if (!data.length || data[data.length - 1].date !== key) {
        data.push({ date: key, count: map.get(key) ?? 0 });
      }
      if (groupBy === 'day') cur.setDate(cur.getDate() + 1);
      else cur.setMonth(cur.getMonth() + 1);
    }

    const total = data.reduce((s, r) => s + r.count, 0);

    // Previous period total
    const span = new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime();
    const prevTo = new Date(new Date(`${from}T12:00:00`).getTime() - 86400000);
    const prevFrom = new Date(prevTo.getTime() - span);
    const [prevResult] = await this.db
      .select({ cnt: count() })
      .from(activities)
      .where(
        and(
          eq(activities.spaceId, spaceId),
          gte(activities.createdAt, prevFrom),
          lte(activities.createdAt, prevTo),
        ),
      );
    const previousTotal = Number(prevResult?.cnt ?? 0);

    return {
      total,
      previous_total: previousTotal,
      period_label: periodLabel,
      group_by: groupBy,
      data,
    };
  }

  async findOne(spaceId: number, activityId: number) {
    const [row] = await this.db
      .select()
      .from(activities)
      .where(and(eq(activities.spaceId, spaceId), eq(activities.id, BigInt(activityId))))
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
