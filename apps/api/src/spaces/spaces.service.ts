import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { spaces } from '../db/schema';

@Injectable()
export class SpacesService {
  constructor(@Inject(DB) private db: DbType) {}

  async getAllSpaces() {
    const allSpaces = await this.db.select().from(spaces);
    return {
      spaces: allSpaces.map((s) => ({
        id: s.id,
        name: s.name,
        domain: s.domain ?? '',
        updatedAt: s.updatedAt,
        createdAt: s.createdAt,
      })),
    };
  }

  async getSpaceMe(spaceId: number) {
    const [space] = await this.db
      .select()
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);

    if (!space) return null;

    // Storyblok CDN /spaces/me response shape
    return {
      space: {
        id: space.id,
        name: space.name,
        domain: space.domain ?? '',
        version: space.version,
        language_codes: space.languageCodes ?? [],
      },
    };
  }
}
