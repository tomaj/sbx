import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq, and, gte, lte, isNull } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { webhookEndpoints, webhookLogs } from '../db/schema';
import { JobsClient } from '@sbx/jobs';
import { JOBS_CLIENT } from '../jobs/jobs.module';

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(DB) private db: DbType,
    @Inject(JOBS_CLIENT) private jobs: JobsClient,
  ) {}

  // ─── CDN (read-only) ──────────────────────────────────────────────────────

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.spaceId, spaceId))
      .orderBy(asc(webhookEndpoints.id));

    return { webhook_endpoints: rows.map((w) => this.format(w)) };
  }

  async findOne(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, id))
      .limit(1);

    if (!row || row.spaceId !== spaceId) return null;
    return { webhook_endpoint: this.format(row) };
  }

  // ─── Admin CRUD ───────────────────────────────────────────────────────────

  async adminList(spaceId: number) {
    const rows = await this.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.spaceId, spaceId))
      .orderBy(asc(webhookEndpoints.id));

    return { webhooks: rows.map((w) => this.format(w)) };
  }

  async adminCreate(
    spaceId: number,
    data: {
      name: string;
      endpoint: string;
      description?: string | null;
      secret?: string | null;
      actions: string[];
      activated?: boolean;
    },
  ) {
    // Use a simple auto-increment ID via max+1 since the table uses integer PK
    const existing = await this.db
      .select({ id: webhookEndpoints.id })
      .from(webhookEndpoints)
      .orderBy(desc(webhookEndpoints.id))
      .limit(1);

    const nextId = existing.length > 0 ? (existing[0].id as number) + 1 : 1;

    const [created] = await this.db
      .insert(webhookEndpoints)
      .values({
        id: nextId,
        spaceId,
        name: data.name,
        endpoint: data.endpoint,
        description: data.description ?? null,
        secret: data.secret ?? null,
        actions: data.actions,
        activated: data.activated ?? true,
      })
      .returning();

    return { webhook: this.format(created) };
  }

  async adminUpdate(
    spaceId: number,
    id: number,
    data: {
      name?: string;
      endpoint?: string;
      description?: string | null;
      secret?: string | null;
      actions?: string[];
      activated?: boolean;
    },
  ) {
    const [updated] = await this.db
      .update(webhookEndpoints)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.endpoint !== undefined && { endpoint: data.endpoint }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.secret !== undefined && { secret: data.secret }),
        ...(data.actions !== undefined && { actions: data.actions }),
        ...(data.activated !== undefined && { activated: data.activated }),
        updatedAt: new Date(),
      })
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.spaceId, spaceId)))
      .returning();

    if (!updated) return null;
    return { webhook: this.format(updated) };
  }

  async adminDelete(spaceId: number, id: number) {
    await this.db
      .delete(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.spaceId, spaceId)));

    return { deleted: true };
  }

  // ─── Logs ─────────────────────────────────────────────────────────────────

  async listLogs(
    spaceId: number,
    opts: { webhookId?: number; from?: Date; to?: Date; page?: number; perPage?: number },
  ) {
    const page = opts.page ?? 1;
    const perPage = opts.perPage ?? 25;

    const conditions = [eq(webhookLogs.spaceId, spaceId)];
    if (opts.webhookId) conditions.push(eq(webhookLogs.webhookEndpointId, opts.webhookId));
    if (opts.from) conditions.push(gte(webhookLogs.executedAt, opts.from));
    if (opts.to) conditions.push(lte(webhookLogs.executedAt, opts.to));

    const rows = await this.db
      .select({
        log: webhookLogs,
        webhookName: webhookEndpoints.name,
      })
      .from(webhookLogs)
      .leftJoin(webhookEndpoints, eq(webhookLogs.webhookEndpointId, webhookEndpoints.id))
      .where(and(...conditions))
      .orderBy(desc(webhookLogs.executedAt))
      .limit(perPage)
      .offset((page - 1) * perPage);

    return {
      logs: rows.map(({ log, webhookName }) => ({
        id: log.id,
        webhookEndpointId: log.webhookEndpointId,
        webhookName: webhookName ?? null,
        action: log.action,
        status: log.status,
        responseStatus: log.responseStatus,
        executedAt: log.executedAt,
      })),
    };
  }

  async getLog(spaceId: number, logId: number) {
    const [row] = await this.db
      .select({
        log: webhookLogs,
        webhookName: webhookEndpoints.name,
      })
      .from(webhookLogs)
      .leftJoin(webhookEndpoints, eq(webhookLogs.webhookEndpointId, webhookEndpoints.id))
      .where(and(eq(webhookLogs.id, logId), eq(webhookLogs.spaceId, spaceId)))
      .limit(1);

    if (!row) return null;

    return {
      log: {
        id: row.log.id,
        webhookEndpointId: row.log.webhookEndpointId,
        webhookName: row.webhookName ?? null,
        action: row.log.action,
        status: row.log.status,
        requestBody: row.log.requestBody,
        responseBody: row.log.responseBody,
        responseStatus: row.log.responseStatus,
        executedAt: row.log.executedAt,
      },
    };
  }

  async retryLog(spaceId: number, logId: number) {
    const result = await this.getLog(spaceId, logId);
    if (!result) return null;

    const log = result.log;

    const [endpoint] = await this.db
      .select()
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, log.webhookEndpointId), eq(webhookEndpoints.spaceId, spaceId)))
      .limit(1);

    if (!endpoint) return null;

    await this.jobs.webhooks.dispatch({
      spaceId,
      webhookEndpointId: endpoint.id,
      endpoint: endpoint.endpoint,
      secret: endpoint.secret ?? null,
      action: log.action,
      payload: (log.requestBody ?? {}) as Record<string, unknown>,
    });

    return { queued: true };
  }

  // ─── Dispatch (called internally when events happen) ─────────────────────
  // Enqueues one BullMQ job per active webhook endpoint matching the action.
  // Actual HTTP delivery + logging happens in apps/workers.

  async dispatch(spaceId: number, action: string, payload: Record<string, any>) {
    const endpoints = await this.db
      .select()
      .from(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.spaceId, spaceId),
          eq(webhookEndpoints.activated, true),
          isNull(webhookEndpoints.deletedAt),
        ),
      );

    for (const endpoint of endpoints) {
      const actions = endpoint.actions as string[];
      if (!actions.includes(action)) continue;

      await this.jobs.webhooks.dispatch({
        spaceId,
        webhookEndpointId: endpoint.id,
        endpoint: endpoint.endpoint,
        secret: endpoint.secret ?? null,
        action,
        payload,
      });
    }
  }

  private format(w: typeof webhookEndpoints.$inferSelect) {
    return {
      id: w.id,
      name: w.name,
      description: w.description ?? null,
      endpoint: w.endpoint,
      space_id: w.spaceId,
      secret: w.secret ?? null,
      actions: w.actions,
      activated: w.activated,
      deleted_at: w.deletedAt ?? null,
      created_at: w.createdAt,
      updated_at: w.updatedAt,
    };
  }
}
