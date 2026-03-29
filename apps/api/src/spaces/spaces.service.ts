import { Inject, Injectable } from '@nestjs/common';
import { eq, max } from 'drizzle-orm';
import { randomUUID } from 'crypto';
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
        previewUrls: (space.previewUrls as { name: string; location: string }[]) ?? [],
        encodeUrl: space.encodeUrl,
        mobileWidth: space.mobileWidth,
        visualEditorDisabled: space.visualEditorDisabled,
        assetLibrarySettings: (space.assetLibrarySettings as Record<string, unknown>) ?? {},
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
      },
    };
  }

  async updateSpace(
    spaceId: number,
    data: {
      name?: string;
      defaultRoot?: string | null;
      domain?: string | null;
      previewUrls?: { name: string; location: string }[];
      encodeUrl?: boolean;
      mobileWidth?: number;
      visualEditorDisabled?: boolean;
      assetLibrarySettings?: Record<string, unknown>;
    },
  ) {
    const [updated] = await this.db
      .update(spaces)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.defaultRoot !== undefined && { defaultRoot: data.defaultRoot }),
        ...(data.domain !== undefined && { domain: data.domain }),
        ...(data.previewUrls !== undefined && { previewUrls: data.previewUrls }),
        ...(data.encodeUrl !== undefined && { encodeUrl: data.encodeUrl }),
        ...(data.mobileWidth !== undefined && { mobileWidth: data.mobileWidth }),
        ...(data.visualEditorDisabled !== undefined && { visualEditorDisabled: data.visualEditorDisabled }),
        ...(data.assetLibrarySettings !== undefined && { assetLibrarySettings: data.assetLibrarySettings }),
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
        previewUrls: (updated.previewUrls as { name: string; location: string }[]) ?? [],
        encodeUrl: updated.encodeUrl,
        mobileWidth: updated.mobileWidth,
        visualEditorDisabled: updated.visualEditorDisabled,
        assetLibrarySettings: (updated.assetLibrarySettings as Record<string, unknown>) ?? {},
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  }

  async createSpace(data: { name: string; domain?: string | null }) {
    const [maxRow] = await this.db.select({ maxId: max(spaces.id) }).from(spaces);
    const nextId = (maxRow?.maxId ?? 0) + 1;

    const [created] = await this.db
      .insert(spaces)
      .values({
        id: nextId,
        uuid: randomUUID(),
        name: data.name,
        domain: data.domain ?? null,
      })
      .returning();

    return {
      space: {
        id: created.id,
        uuid: created.uuid,
        name: created.name,
        domain: created.domain ?? '',
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
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
