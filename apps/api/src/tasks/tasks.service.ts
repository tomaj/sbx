import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, ilike, or, sql, desc } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { tasks, spaces } from '../db/schema';

@Injectable()
export class TasksService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.spaceId, spaceId))
      .orderBy(asc(tasks.id));

    return { tasks: rows.map((t) => this.format(t)) };
  }

  async findOne(spaceId: number, id: number) {
    const [row] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!row || row.spaceId !== spaceId) return null;
    return { task: this.format(row) };
  }

  async create(spaceId: number, body: {
    name: string;
    description?: string;
    task_type?: string;
    webhook_url?: string;
    user_dialog?: any;
  }) {
    const [row] = await this.db
      .insert(tasks)
      .values({
        spaceId,
        name: body.name,
        description: body.description ?? null,
        taskType: body.task_type ?? 'webhook',
        webhookUrl: body.webhook_url ?? null,
        userDialog: body.user_dialog ?? {},
      })
      .returning();

    return { task: this.format(row) };
  }

  async update(spaceId: number, id: number, body: {
    name?: string;
    description?: string;
    task_type?: string;
    webhook_url?: string;
    user_dialog?: any;
  }) {
    const [existing] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!existing || existing.spaceId !== spaceId) throw new NotFoundException();

    const [row] = await this.db
      .update(tasks)
      .set({
        name: body.name ?? existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        taskType: body.task_type ?? existing.taskType,
        webhookUrl: body.webhook_url !== undefined ? body.webhook_url : existing.webhookUrl,
        userDialog: body.user_dialog !== undefined ? body.user_dialog : existing.userDialog,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    return { task: this.format(row) };
  }

  async remove(spaceId: number, id: number) {
    const [existing] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!existing || existing.spaceId !== spaceId) throw new NotFoundException();

    await this.db.delete(tasks).where(eq(tasks.id, id));
    return {};
  }

  async execute(spaceId: number, id: number, userInput?: any) {
    const [row] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!row || row.spaceId !== spaceId) throw new NotFoundException();
    if (!row.webhookUrl) throw new NotFoundException();

    const payload = { task: { id: row.id, name: row.name }, space_id: spaceId, ...(userInput ?? {}) };

    let lastResponse: any = null;
    try {
      await this.db.update(tasks).set({ running: true, updatedAt: new Date() }).where(eq(tasks.id, id));

      const res = await fetch(row.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
      lastResponse = { status: res.status, ok: res.ok };
    } catch (err: any) {
      lastResponse = { error: err.message };
    }

    const [updated] = await this.db
      .update(tasks)
      .set({ running: false, lastExecution: new Date(), lastResponse, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    return { task: this.format(updated) };
  }

  private format(t: typeof tasks.$inferSelect) {
    return {
      id: Number(t.id),
      name: t.name,
      description: t.description ?? null,
      task_type: t.taskType,
      last_execution: t.lastExecution ?? null,
      running: t.running,
      last_response: t.lastResponse ?? null,
      protected_vars: t.webhookUrl ? '•••••••' : null,
      webhook_url: t.webhookUrl ?? null,
      user_dialog: t.userDialog ?? {},
      space_id: t.spaceId,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    };
  }
}
