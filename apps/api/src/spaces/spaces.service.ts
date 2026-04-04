import { Inject, Injectable } from '@nestjs/common';
import { eq, max, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { spaces, spaceMembers, users, stories, assets, apiTokens } from '../db/schema';

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
        updated_at: s.updatedAt,
        created_at: s.createdAt,
        last_activity_at: lastActivityBySpace.get(s.id) ?? null,
        members: (membersBySpace.get(s.id) ?? []).map((m) => ({
          firstname: m.firstname ?? '',
          lastname: m.lastname ?? '',
          avatar: m.avatar,
        })),
      })),
    };
  }

  /**
   * Shared helper to build the full Storyblok-compatible space response object.
   */
  private formatSpaceResponse(
    space: typeof spaces.$inferSelect,
    extra?: {
      stories_count?: number;
      assets_count?: number;
      first_token?: string | null;
    },
  ) {
    return {
      space: {
        id: space.id,
        uuid: space.uuid,
        name: space.name,
        domain: space.domain ?? '',
        uniq_domain: null,
        plan: 'enterprise',
        plan_level: 400,
        trial: false,
        owner_id: null,
        role: 'admin',
        owner: null,
        stories_count: extra?.stories_count ?? 0,
        assets_count: extra?.assets_count ?? 0,
        default_root: space.defaultRoot ?? null,
        default_lang: space.defaultLang ?? 'default',
        parent_id: null,
        created_at: space.createdAt,
        updated_at: space.updatedAt,
        story_published_hook: null,
        environments: (space.previewUrls as { name: string; location: string }[]) ?? [],
        first_token: extra?.first_token ?? space.firstToken ?? '',
        limits: {},
        options: {
          languages: space.languageCodes ?? [],
        },
        collaborators: [],
        // Additional fields used by admin UI
        preview_urls: (space.previewUrls as { name: string; location: string }[]) ?? [],
        encode_url: space.encodeUrl,
        mobile_width: space.mobileWidth,
        visual_editor_disabled: space.visualEditorDisabled,
        asset_library_settings: (space.assetLibrarySettings as Record<string, unknown>) ?? {},
      },
    };
  }

  async getSpaceById(spaceId: number) {
    const [space] = await this.db.select().from(spaces).where(eq(spaces.id, spaceId)).limit(1);

    if (!space) return null;

    const [storiesRow] = await this.db
      .select({ count: count() })
      .from(stories)
      .where(eq(stories.spaceId, spaceId));

    const [assetsRow] = await this.db
      .select({ count: count() })
      .from(assets)
      .where(eq(assets.spaceId, spaceId));

    const [tokenRow] = await this.db
      .select({ token: apiTokens.token })
      .from(apiTokens)
      .where(eq(apiTokens.spaceId, spaceId))
      .limit(1);

    return this.formatSpaceResponse(space, {
      stories_count: storiesRow?.count ?? 0,
      assets_count: assetsRow?.count ?? 0,
      first_token: tokenRow?.token ?? space.firstToken ?? '',
    });
  }

  async updateSpace(
    spaceId: number,
    data: {
      name?: string;
      defaultRoot?: string | null;
      defaultLang?: string;
      domain?: string | null;
      previewUrls?: { name: string; location: string }[];
      encodeUrl?: boolean;
      mobileWidth?: number;
      visualEditorDisabled?: boolean;
      assetLibrarySettings?: Record<string, unknown>;
      storyPublishedHook?: string | null;
      environments?: { name: string; location: string }[];
    },
  ) {
    // If environments is provided, use it as previewUrls (they map to the same DB field)
    const previewUrls = data.environments ?? data.previewUrls;

    const [updated] = await this.db
      .update(spaces)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.defaultRoot !== undefined && { defaultRoot: data.defaultRoot }),
        ...(data.defaultLang !== undefined && { defaultLang: data.defaultLang }),
        ...(data.domain !== undefined && { domain: data.domain }),
        ...(previewUrls !== undefined && { previewUrls }),
        ...(data.encodeUrl !== undefined && { encodeUrl: data.encodeUrl }),
        ...(data.mobileWidth !== undefined && { mobileWidth: data.mobileWidth }),
        ...(data.visualEditorDisabled !== undefined && {
          visualEditorDisabled: data.visualEditorDisabled,
        }),
        ...(data.assetLibrarySettings !== undefined && {
          assetLibrarySettings: data.assetLibrarySettings,
        }),
        updatedAt: new Date(),
      })
      .where(eq(spaces.id, spaceId))
      .returning();

    if (!updated) return null;

    return this.formatSpaceResponse(updated);
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

    return this.formatSpaceResponse(created);
  }

  async getSpaceMe(spaceId: number) {
    const [space] = await this.db.select().from(spaces).where(eq(spaces.id, spaceId)).limit(1);

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
