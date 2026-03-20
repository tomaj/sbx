import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { webhookEndpoints } from '../db/schema';

@Injectable()
export class WebhooksService {
  constructor(@Inject(DB) private db: DbType) {}

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
