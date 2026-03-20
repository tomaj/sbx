import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { spaces, spaceMembers, users } from '../db/schema';

@Injectable()
export class SpacesService {
  constructor(@Inject(DB) private db: DbType) {}

  async getAllSpaces() {
    const allSpaces = await this.db.select().from(spaces);

    const allMembers = await this.db
      .select({
        spaceId: spaceMembers.spaceId,
        firstname: users.firstname,
        lastname: users.lastname,
        avatar: users.avatar,
      })
      .from(spaceMembers)
      .leftJoin(users, eq(spaceMembers.userId, users.id));

    const membersBySpace = new Map<number, typeof allMembers>();
    for (const m of allMembers) {
      if (!membersBySpace.has(m.spaceId)) membersBySpace.set(m.spaceId, []);
      membersBySpace.get(m.spaceId)!.push(m);
    }

    return {
      spaces: allSpaces.map((s) => ({
        id: s.id,
        name: s.name,
        updatedAt: s.updatedAt,
        createdAt: s.createdAt,
        members: (membersBySpace.get(s.id) ?? []).map((m) => ({
          firstname: m.firstname ?? '',
          lastname: m.lastname ?? '',
          avatar: m.avatar,
        })),
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
