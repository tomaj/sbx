import { Inject, Injectable } from '@nestjs/common';
import { eq, max } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { spaces, spaceMembers, users, stories } from '../db/schema';

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

    const lastUpdates = await this.db
      .select({ spaceId: stories.spaceId, lastAt: max(stories.updatedAt) })
      .from(stories)
      .groupBy(stories.spaceId);

    const membersBySpace = new Map<number, typeof allMembers>();
    for (const m of allMembers) {
      if (!membersBySpace.has(m.spaceId)) membersBySpace.set(m.spaceId, []);
      membersBySpace.get(m.spaceId)!.push(m);
    }

    const lastActivityBySpace = new Map<number, Date | null>();
    for (const a of lastUpdates) {
      lastActivityBySpace.set(a.spaceId, a.lastAt);
    }

    return {
      spaces: allSpaces.map((s) => ({
        id: s.id,
        name: s.name,
        updatedAt: s.updatedAt,
        createdAt: s.createdAt,
        lastActivityAt: lastActivityBySpace.get(s.id) ?? null,
        members: (membersBySpace.get(s.id) ?? []).map((m) => ({
          firstname: m.firstname ?? '',
          lastname: m.lastname ?? '',
          avatar: m.avatar,
        })),
      })),
    };
  }

  async getSpaceById(spaceId: number) {
    const [space] = await this.db
      .select()
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);

    if (!space) return null;

    return {
      space: {
        id: space.id,
        uuid: space.uuid,
        name: space.name,
        domain: space.domain ?? '',
        defaultRoot: space.defaultRoot ?? null,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
      },
    };
  }

  async updateSpace(spaceId: number, data: { name?: string; defaultRoot?: string | null }) {
    const [updated] = await this.db
      .update(spaces)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.defaultRoot !== undefined && { defaultRoot: data.defaultRoot }),
        updatedAt: new Date(),
      })
      .where(eq(spaces.id, spaceId))
      .returning();

    if (!updated) return null;

    return {
      space: {
        id: updated.id,
        uuid: updated.uuid,
        name: updated.name,
        domain: updated.domain ?? '',
        defaultRoot: updated.defaultRoot ?? null,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
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
