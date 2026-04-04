import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, count, desc, eq, gte, lte, sql, sum } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { aiLogs } from '../db/schema';

export interface AiLogEntry {
  spaceId: number;
  operation: string;
  providerName: string;
  modelIdentifier: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  status: 'success' | 'error';
  errorMessage?: string;
  durationMs?: number;
}

@Injectable()
export class AiLogsService {
  constructor(@Inject(DB) private db: DbType) {}

  async log(entry: AiLogEntry): Promise<void> {
    await this.db.insert(aiLogs).values({
      spaceId: entry.spaceId,
      operation: entry.operation,
      providerName: entry.providerName,
      modelIdentifier: entry.modelIdentifier,
      inputTokens: entry.inputTokens ?? null,
      outputTokens: entry.outputTokens ?? null,
      totalTokens: entry.totalTokens ?? null,
      status: entry.status,
      errorMessage: entry.errorMessage ?? null,
      durationMs: entry.durationMs ?? null,
    });
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
      case 'last_14_days':
      default:
        from = new Date(now.getTime() - 13 * 86400000).toISOString().slice(0, 10);
        periodLabel = 'last 14 days';
        break;
    }

    const bucketExpr = groupBy === 'day'
      ? sql<string>`to_char(${aiLogs.createdAt}, 'YYYY-MM-DD')`
      : sql<string>`to_char(${aiLogs.createdAt}, 'YYYY-MM')`;

    const rows = await this.db
      .select({
        bucket: bucketExpr,
        count: count(),
        tokens: sum(aiLogs.totalTokens),
      })
      .from(aiLogs)
      .where(
        and(
          eq(aiLogs.spaceId, spaceId),
          gte(aiLogs.createdAt, new Date(from)),
          lte(aiLogs.createdAt, new Date(to + 'T23:59:59')),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const countMap = new Map(rows.map((r) => [r.bucket, Number(r.count)]));
    const tokenMap = new Map(rows.map((r) => [r.bucket, Number(r.tokens ?? 0)]));

    const data: { date: string; count: number; tokens: number }[] = [];
    const end = new Date(to + 'T12:00:00');
    const cur = new Date(from + 'T12:00:00');
    while (cur <= end) {
      const key =
        groupBy === 'day'
          ? cur.toISOString().slice(0, 10)
          : `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      if (!data.length || data[data.length - 1].date !== key) {
        data.push({ date: key, count: countMap.get(key) ?? 0, tokens: tokenMap.get(key) ?? 0 });
      }
      if (groupBy === 'day') cur.setDate(cur.getDate() + 1);
      else cur.setMonth(cur.getMonth() + 1);
    }

    const total = data.reduce((s, r) => s + r.count, 0);
    const totalTokens = data.reduce((s, r) => s + r.tokens, 0);

    // Previous period
    const span = new Date(to + 'T12:00:00').getTime() - new Date(from + 'T12:00:00').getTime();
    const prevTo = new Date(new Date(from + 'T12:00:00').getTime() - 86400000);
    const prevFrom = new Date(prevTo.getTime() - span);
    const [prevResult] = await this.db
      .select({ cnt: count() })
      .from(aiLogs)
      .where(
        and(
          eq(aiLogs.spaceId, spaceId),
          gte(aiLogs.createdAt, prevFrom),
          lte(aiLogs.createdAt, prevTo),
        ),
      );
    const previousTotal = Number(prevResult?.cnt ?? 0);

    return { total, previous_total: previousTotal, total_tokens: totalTokens, period_label: periodLabel, group_by: groupBy, data };
  }
}
