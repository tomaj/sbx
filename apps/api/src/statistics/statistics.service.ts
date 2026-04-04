import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { apiRequestLogs, assets, statistics } from '../db/schema';

@Injectable()
export class StatisticsService {
  constructor(@Inject(DB) private db: DbType) {}

  /** Insert a detailed request log entry. */
  async logRequest(entry: {
    spaceId: number;
    userId?: number | null;
    method: string;
    path: string;
    statusCode?: number | null;
    responseTimeMs?: number | null;
    tokenType?: string | null;
  }): Promise<void> {
    await this.db.insert(apiRequestLogs).values({
      spaceId: entry.spaceId,
      userId: entry.userId ?? null,
      method: entry.method,
      path: entry.path,
      statusCode: entry.statusCode ?? null,
      responseTimeMs: entry.responseTimeMs ?? null,
      tokenType: entry.tokenType ?? null,
    });
  }

  /** Delete log entries older than given days (default 31). */
  async pruneOldLogs(olderThanDays = 31): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    await this.db.delete(apiRequestLogs).where(lte(apiRequestLogs.createdAt, cutoff));
  }

  /** Atomically increment request count for a space on today's date. */
  async increment(spaceId: number, bytes = 0): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    await this.db.execute(sql`
      INSERT INTO statistics (space_id, counting, total_bytes, created_at)
      VALUES (${spaceId}, 1, ${bytes}, ${today})
      ON CONFLICT (space_id, created_at)
      DO UPDATE SET
        counting = statistics.counting + 1,
        total_bytes = statistics.total_bytes + ${bytes}
    `);
  }

  /** Space traffic for a given period with day/month grouping. */
  async findSpaceTraffic(spaceId: number, period: string) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let from: string;
    let to: string = today;
    let groupBy: 'day' | 'month' = 'day';
    let periodLabel: string;

    switch (period) {
      case 'last_7_days':
        from = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
        groupBy = 'day';
        periodLabel = 'last 7 days';
        break;
      case 'last_month': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        from = lm.toISOString().slice(0, 10);
        to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
        groupBy = 'day';
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
      default:
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        groupBy = 'day';
        periodLabel = 'this month';
        break;
    }

    const fmt = groupBy === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';

    const rows = await this.db.execute<{ period: string; count: string }>(sql`
      SELECT
        to_char(created_at, ${fmt}) AS period,
        SUM(counting)::bigint AS count
      FROM statistics
      WHERE space_id = ${spaceId}
        AND created_at >= ${from}
        AND created_at <= ${to}
      GROUP BY period
      ORDER BY period
    `);

    // Build full date range with zeros filled in
    const data = this.fillDateRange(from, to, groupBy, rows.rows);
    const total = data.reduce((s, d) => s + d.count, 0);

    // Previous period total for comparison
    const prevFrom = this.shiftDate(from, to, groupBy);
    const prevRows = await this.db.execute<{ cnt: string }>(sql`
      SELECT COALESCE(SUM(counting), 0)::bigint AS cnt
      FROM statistics
      WHERE space_id = ${spaceId}
        AND created_at >= ${prevFrom}
        AND created_at < ${from}
    `);
    const previousTotal = Number(prevRows.rows[0]?.cnt ?? 0);

    return {
      total,
      previous_total: previousTotal,
      period_label: periodLabel,
      group_by: groupBy,
      data,
    };
  }

  private fillDateRange(
    from: string,
    to: string,
    groupBy: 'day' | 'month',
    rows: { period: string; count: string }[],
  ): { date: string; count: number }[] {
    const map = new Map(rows.map((r) => [r.period, Number(r.count)]));
    const result: { date: string; count: number }[] = [];
    const end = new Date(`${to}T12:00:00`);
    const cur = new Date(`${from}T12:00:00`);

    while (cur <= end) {
      const key =
        groupBy === 'day'
          ? cur.toISOString().slice(0, 10)
          : `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      if (!result.length || result[result.length - 1].date !== key) {
        result.push({ date: key, count: map.get(key) ?? 0 });
      }
      if (groupBy === 'day') {
        cur.setDate(cur.getDate() + 1);
      } else {
        cur.setMonth(cur.getMonth() + 1);
      }
    }
    return result;
  }

  private shiftDate(from: string, to: string, groupBy: 'day' | 'month'): string {
    const f = new Date(`${from}T12:00:00`);
    const t = new Date(`${to}T12:00:00`);
    const diffDays = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
    if (groupBy === 'day') {
      f.setDate(f.getDate() - diffDays);
    } else {
      const diffMonths =
        (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth()) + 1;
      f.setMonth(f.getMonth() - diffMonths);
    }
    return f.toISOString().slice(0, 10);
  }

  /** Per-space stats for a given month (date = any day in that month). */
  async findBySpaceAndMonth(spaceId: number, dateStr: string) {
    const d = new Date(dateStr);
    const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

    const rows = await this.db
      .select()
      .from(statistics)
      .where(
        and(
          eq(statistics.spaceId, spaceId),
          gte(statistics.createdAt, from),
          lte(statistics.createdAt, to),
        ),
      )
      .orderBy(statistics.createdAt);

    return rows.map((r) => ({
      id: r.id,
      counting: r.counting,
      total_bytes: r.totalBytes,
      created_at: r.createdAt,
    }));
  }

  /** Org-level all_traffic aggregated by day/month/year. */
  async orgAllTraffic(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'month' | 'year' = 'month',
  ) {
    const fmt = groupBy === 'day' ? 'YYYY-MM-DD' : groupBy === 'month' ? 'YYYY-MM' : 'YYYY';

    // Aggregate across all spaces grouped by period
    const byPeriod = await this.db.execute<{
      period: string;
      api_requests: string;
      total_bytes: string;
    }>(sql`
      SELECT
        to_char(created_at, ${fmt}) AS period,
        SUM(counting)::bigint AS api_requests,
        SUM(total_bytes)::bigint AS total_bytes
      FROM statistics
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY period
      ORDER BY period
    `);

    // Per-space breakdown grouped by period
    const bySpace = await this.db.execute<{
      space_id: number;
      period: string;
      api_requests: string;
      total_bytes: string;
    }>(sql`
      SELECT
        space_id,
        to_char(created_at, ${fmt}) AS period,
        SUM(counting)::bigint AS api_requests,
        SUM(total_bytes)::bigint AS total_bytes
      FROM statistics
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY space_id, period
      ORDER BY space_id, period
    `);

    // Total for the period
    const totalRequests = byPeriod.rows.reduce(
      (s: number, r: { api_requests: string }) => s + Number(r.api_requests),
      0,
    );
    const totalBytes = byPeriod.rows.reduce(
      (s: number, r: { total_bytes: string }) => s + Number(r.total_bytes),
      0,
    );

    // Requests last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7 = sevenDaysAgo.toISOString().slice(0, 10);
    const last7Result = await this.db.execute<{ cnt: string }>(sql`
      SELECT COALESCE(SUM(counting), 0)::bigint AS cnt
      FROM statistics
      WHERE created_at >= ${last7}
    `);
    const requestsLast7 = Number(last7Result.rows[0]?.cnt ?? 0);

    // Top spaces by requests in period
    const topSpaces: Record<string, number> = {};
    for (const row of bySpace.rows) {
      const sid = String(row.space_id);
      topSpaces[sid] = (topSpaces[sid] ?? 0) + Number(row.api_requests);
    }

    // Per-space traffic array grouped by period
    const spaceTraffic: Record<
      string,
      { date: string; api_requests: number; total_bytes: number }[]
    > = {};
    for (const row of bySpace.rows) {
      const sid = String(row.space_id);
      if (!spaceTraffic[sid]) spaceTraffic[sid] = [];
      spaceTraffic[sid].push({
        date: row.period,
        api_requests: Number(row.api_requests),
        total_bytes: Number(row.total_bytes),
      });
    }

    return {
      montly_traffic_limit: 0,
      yearly_traffic_limit: 0,
      traffic_used_this_year: totalRequests,
      cumulated_traffic: {
        requests_used_last_days: requestsLast7,
        total_requests_per_time_period: totalRequests,
        total_traffic_per_time_period: totalBytes,
        traffic: byPeriod.rows.map(
          (r: { period: string; api_requests: string; total_bytes: string }) => ({
            date: r.period,
            api_requests: Number(r.api_requests),
            total_bytes: Number(r.total_bytes),
          }),
        ),
      },
      traffic_top_spaces: topSpaces,
      traffic: spaceTraffic,
    };
  }

  /** Asset upload growth for a given period — count of new assets grouped by day/month. */
  async findSpaceAssetsGrowth(spaceId: number, period: string) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let from: string;
    let to: string = today;
    let groupBy: 'day' | 'month' = 'day';
    let periodLabel: string;

    switch (period) {
      case 'last_7_days':
        from = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
        groupBy = 'day';
        periodLabel = 'last 7 days';
        break;
      case 'last_14_days':
        from = new Date(now.getTime() - 13 * 86400000).toISOString().slice(0, 10);
        groupBy = 'day';
        periodLabel = 'last 14 days';
        break;
      case 'last_month': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        from = lm.toISOString().slice(0, 10);
        to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
        groupBy = 'day';
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
      default:
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        groupBy = 'day';
        periodLabel = 'this month';
        break;
    }

    const fmt = groupBy === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';

    const rows = await this.db.execute<{ period: string; count: string }>(sql`
      SELECT
        to_char(created_at AT TIME ZONE 'UTC', ${fmt}) AS period,
        COUNT(*)::bigint AS count
      FROM assets
      WHERE space_id = ${spaceId}
        AND deleted_at IS NULL
        AND created_at >= ${from}::timestamptz
        AND created_at < (${to}::date + INTERVAL '1 day')::timestamptz
      GROUP BY period
      ORDER BY period
    `);

    const data = this.fillDateRange(from, to, groupBy, rows.rows);
    const total = data.reduce((s, d) => s + d.count, 0);

    const prevFrom = this.shiftDate(from, to, groupBy);
    const prevRows = await this.db.execute<{ cnt: string }>(sql`
      SELECT COALESCE(COUNT(*), 0)::bigint AS cnt
      FROM assets
      WHERE space_id = ${spaceId}
        AND deleted_at IS NULL
        AND created_at >= ${prevFrom}::timestamptz
        AND created_at < ${from}::timestamptz
    `);
    const previousTotal = Number(prevRows.rows[0]?.cnt ?? 0);

    return {
      total,
      previous_total: previousTotal,
      period_label: periodLabel,
      group_by: groupBy,
      data,
    };
  }

  /** Asset-level bandwidth stats — returns assets with their file size as proxy. */
  async orgAssetsTraffic(startDate: string, endDate: string) {
    // We don't track per-asset CDN bytes yet. Return all assets with content_length
    // as their known size and total_bytes = 0 (no CDN tracking).
    const rows = await this.db
      .select({
        id: assets.id,
        alt: assets.alt,
        folderId: assets.folderId,
        contentLength: assets.contentLength,
        contentType: assets.contentType,
        deletedAt: assets.deletedAt,
        filename: assets.filename,
        spaceId: assets.spaceId,
      })
      .from(assets)
      .where(
        and(
          gte(assets.createdAt, new Date(startDate)),
          lte(assets.createdAt, new Date(`${endDate}T23:59:59`)),
        ),
      )
      .orderBy(desc(assets.createdAt));

    return {
      assets: rows.map((a) => ({
        id: Number(a.id),
        alt: a.alt,
        asset_folder_id: a.folderId ? Number(a.folderId) : null,
        content_length: a.contentLength ?? 0,
        content_type: a.contentType,
        deleted_at: a.deletedAt?.toISOString() ?? null,
        filename: a.filename,
        is_private: false,
        space_id: a.spaceId,
        total_bytes: 0,
      })),
    };
  }
}
