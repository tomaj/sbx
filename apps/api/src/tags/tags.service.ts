import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { tags } from '../db/schema';

@Injectable()
export class TagsService {
  constructor(@Inject(DB) private db: DbType) {}

  async findAll(spaceId: number) {
    const rows = await this.db
      .select()
      .from(tags)
      .where(eq(tags.spaceId, spaceId))
      .orderBy(asc(tags.name));

    return {
      tags: rows.map((t) => ({
        name: t.name,
        taggings_count: t.taggingsCount,
      })),
    };
  }
}
