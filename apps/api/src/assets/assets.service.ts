import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ResultGuard } from '../shared/result-guard.util';
import { and, asc, desc, count, eq, ilike, isNull, isNotNull, or, sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { assets, assetFolders, internalTags } from '../db/schema';
import { AiService } from '../ai/ai.service';
import { AiConfigurationsService } from '../ai-configurations/ai-configurations.service';
import { escapeLike } from '../shared/query-parser.util';
import { inArray } from 'drizzle-orm';
import { StorageService } from '../storage/storage.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WEBHOOK_ACTIONS } from '../webhooks/webhook-actions';

@Injectable()
export class AssetsService {
  constructor(
    @Inject(DB) private db: DbType,
    private readonly storage: StorageService,
    private readonly webhooks: WebhooksService,
    private readonly ai: AiService,
    private readonly aiConfigurations: AiConfigurationsService,
  ) {}

  // ─── Folders ────────────────────────────────────────────────────────────────

  async listFolders(
    spaceId: number,
    opts?: {
      byIds?: number[];
      search?: string;
      withParent?: number;
    },
  ) {
    const conditions: any[] = [eq(assetFolders.spaceId, spaceId)];

    if (opts?.byIds && opts.byIds.length > 0) {
      conditions.push(inArray(assetFolders.id, opts.byIds));
    }
    if (opts?.search) {
      conditions.push(ilike(assetFolders.name, `%${escapeLike(opts.search)}%`));
    }
    if (opts?.withParent !== undefined) {
      if (opts.withParent === 0) {
        conditions.push(isNull(assetFolders.parentId));
      } else {
        conditions.push(eq(assetFolders.parentId, opts.withParent));
      }
    }

    const rows = await this.db
      .select()
      .from(assetFolders)
      .where(and(...conditions))
      .orderBy(asc(assetFolders.name));

    const idToUuid = new Map(rows.map((f) => [f.id, f.uuid]));

    return {
      asset_folders: rows.map((f) => this.formatFolder(f, idToUuid)),
    };
  }

  async findFolder(id: number, spaceId: number) {
    const [row] = await this.db
      .select()
      .from(assetFolders)
      .where(and(eq(assetFolders.id, id), eq(assetFolders.spaceId, spaceId)));
    ResultGuard.throwIfNotFound(row, 'Folder not found');

    let parentUuid: string | null = null;
    if (row.parentId) {
      const [parent] = await this.db
        .select({ uuid: assetFolders.uuid })
        .from(assetFolders)
        .where(eq(assetFolders.id, row.parentId))
        .limit(1);
      parentUuid = parent?.uuid ?? null;
    }
    return this.formatFolder(
      row,
      new Map<number, string>([
        [row.id, row.uuid],
        ...(row.parentId ? ([[row.parentId, parentUuid ?? '']] as [number, string][]) : []),
      ]),
    );
  }

  async createFolder(spaceId: number, data: { name: string; parent_id?: number | null }) {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const uuid = crypto.randomUUID();

    let parentUuid: string | null = null;
    if (data.parent_id) {
      const [parent] = await this.db
        .select({ uuid: assetFolders.uuid })
        .from(assetFolders)
        .where(eq(assetFolders.id, data.parent_id))
        .limit(1);
      parentUuid = parent?.uuid ?? null;
    }

    const [row] = await this.db
      .insert(assetFolders)
      .values({ id, spaceId, name: data.name, parentId: data.parent_id ?? null, uuid })
      .returning();

    const idToUuid = new Map<number, string>([[row.id, row.uuid]]);
    if (row.parentId && parentUuid) idToUuid.set(row.parentId, parentUuid);
    return this.formatFolder(row, idToUuid);
  }

  async updateFolder(
    id: number,
    spaceId: number,
    data: { name?: string; parent_id?: number | null },
  ) {
    const [row] = await this.db
      .update(assetFolders)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.parent_id !== undefined ? { parentId: data.parent_id } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(assetFolders.id, id), eq(assetFolders.spaceId, spaceId)))
      .returning();
    ResultGuard.throwIfNotFound(row, 'Folder not found');

    let parentUuid: string | null = null;
    if (row.parentId) {
      const [parent] = await this.db
        .select({ uuid: assetFolders.uuid })
        .from(assetFolders)
        .where(eq(assetFolders.id, row.parentId))
        .limit(1);
      parentUuid = parent?.uuid ?? null;
    }
    const idToUuid = new Map<number, string>([[row.id, row.uuid]]);
    if (row.parentId && parentUuid) idToUuid.set(row.parentId, parentUuid);
    return this.formatFolder(row, idToUuid);
  }

  async deleteFolder(id: number, spaceId: number) {
    const [row] = await this.db
      .delete(assetFolders)
      .where(and(eq(assetFolders.id, id), eq(assetFolders.spaceId, spaceId)))
      .returning();
    ResultGuard.throwIfNotFound(row, 'Folder not found');
    return { deleted: true };
  }

  // ─── Assets ─────────────────────────────────────────────────────────────────

  async listAssets(
    spaceId: number,
    opts: {
      page: number;
      perPage: number;
      search?: string;
      folderId?: number | null;
      sortField?: string;
      sortDir?: 'asc' | 'desc';
      deleted?: boolean;
      contentType?: string;
      isPrivate?: boolean;
      byAlt?: string;
      byCopyright?: string;
      byTitle?: string;
      withTags?: string;
    },
  ) {
    const {
      page,
      perPage,
      search,
      folderId,
      sortField,
      sortDir,
      deleted,
      contentType,
      isPrivate,
      byAlt,
      byCopyright,
      byTitle,
      withTags,
    } = opts;

    const conditions: any[] = [eq(assets.spaceId, spaceId)];

    if (deleted) {
      conditions.push(isNotNull(assets.deletedAt));
    } else {
      conditions.push(isNull(assets.deletedAt));
    }

    if (search) {
      conditions.push(
        or(
          ilike(assets.filename, `%${escapeLike(search)}%`),
          ilike(assets.shortFilename, `%${escapeLike(search)}%`),
          ilike(assets.alt, `%${escapeLike(search)}%`),
          ilike(assets.title, `%${escapeLike(search)}%`),
        ),
      );
    }

    if (folderId !== undefined && folderId !== null) {
      conditions.push(eq(assets.folderId, folderId));
    } else if (folderId === null) {
      conditions.push(isNull(assets.folderId));
    }

    if (contentType) {
      conditions.push(ilike(assets.contentType, `${escapeLike(contentType)}%`));
    }

    if (byAlt) {
      conditions.push(ilike(assets.alt, `%${escapeLike(byAlt)}%`));
    }

    if (byCopyright) {
      conditions.push(ilike(assets.copyright, `%${escapeLike(byCopyright)}%`));
    }

    if (byTitle) {
      conditions.push(ilike(assets.title, `%${escapeLike(byTitle)}%`));
    }

    // with_tags: comma-separated tag names, OR logic — filter assets that have any of these tags
    if (withTags) {
      const tagNames = withTags
        .split(',')
        .slice(0, 1000)
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagNames.length > 0) {
        // Look up tag IDs by name
        const tagRows = await this.db
          .select({ id: internalTags.id })
          .from(internalTags)
          .where(and(eq(internalTags.spaceId, spaceId), inArray(internalTags.name, tagNames)));
        if (tagRows.length === 0) {
          // No matching tags — return empty result
          return { assets: [], total: 0, page, per_page: perPage };
        }
        const tagIdStrings = tagRows.map((t) => String(t.id));
        // internal_tag_ids is a JSON array of string IDs; use SQL to check overlap
        const tagConditions = tagIdStrings.map(
          (tagId) =>
            // Check if the JSON array contains this tag ID string
            // Using raw SQL: internal_tag_ids::jsonb @> '["tagId"]'::jsonb
            // With Drizzle, use sql template
            sql`${assets.internalTagIds}::jsonb @> ${JSON.stringify([tagId])}::jsonb`,
        );
        conditions.push(or(...tagConditions));
      }
    }

    // is_private filter: since we don't store is_private in DB (all assets are public),
    // filtering for private-only returns no results
    if (isPrivate) {
      return { assets: [], total: 0, page, per_page: perPage };
    }

    const where = and(...conditions);

    let orderCol: any;
    switch (sortField) {
      case 'created_at':
        orderCol = assets.createdAt;
        break;
      case 'updated_at':
        orderCol = assets.updatedAt;
        break;
      case 'short_filename':
      case 'filename':
        orderCol = assets.shortFilename;
        break;
      case 'content_length':
        orderCol = assets.contentLength;
        break;
      default:
        orderCol = assets.createdAt;
    }
    const orderFn = sortDir === 'asc' ? asc(orderCol) : desc(orderCol);

    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(assets)
        .where(where)
        .orderBy(orderFn)
        .limit(perPage)
        .offset((page - 1) * perPage),
      this.db.select({ total: count() }).from(assets).where(where),
    ]);

    return {
      assets: rows.map((a) => this.formatAsset(a)),
      total: Number(totals[0]?.total ?? 0),
      page,
      per_page: perPage,
    };
  }

  async getAsset(id: number, spaceId: number) {
    const [row] = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.spaceId, spaceId)));
    ResultGuard.throwIfNotFound(row, 'Asset not found');
    return this.formatAsset(row);
  }

  async updateAsset(
    id: number,
    spaceId: number,
    data: {
      title?: string | null;
      alt?: string | null;
      copyright?: string | null;
      focus?: string | null;
      expire_at?: string | null;
      locked?: boolean;
      folder_id?: number | null;
      meta_data?: Record<string, any>;
      internal_tag_ids?: number[];
    },
  ) {
    const updates: any = { updatedAt: new Date() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.alt !== undefined) updates.alt = data.alt;
    if (data.copyright !== undefined) updates.copyright = data.copyright;
    if (data.focus !== undefined) updates.focus = data.focus;
    if (data.expire_at !== undefined) {
      updates.expireAt = data.expire_at ? new Date(data.expire_at) : null;
    }
    if (data.locked !== undefined) updates.locked = data.locked;
    if (data.folder_id !== undefined) updates.folderId = data.folder_id;
    if (data.meta_data !== undefined) updates.metaData = data.meta_data;
    if (data.internal_tag_ids !== undefined) {
      const ids = data.internal_tag_ids;
      if (ids.length === 0) {
        updates.internalTagIds = [];
        updates.internalTagsList = [];
      } else {
        const tagRows = await this.db
          .select({ id: internalTags.id, name: internalTags.name })
          .from(internalTags)
          .where(inArray(internalTags.id, ids));
        const tagMap = new Map(tagRows.map((t) => [t.id, t.name]));
        const list = ids
          .filter((id) => tagMap.has(id))
          .map((id) => ({ id, name: tagMap.get(id)! }));
        updates.internalTagIds = list.map((t) => String(t.id));
        updates.internalTagsList = list;
      }
    }

    const [row] = await this.db
      .update(assets)
      .set(updates)
      .where(and(eq(assets.id, id), eq(assets.spaceId, spaceId)))
      .returning();
    ResultGuard.throwIfNotFound(row, 'Asset not found');

    void this.webhooks.dispatch(spaceId, 'asset.updated', {
      action: 'asset_updated',
      space_id: spaceId,
      asset_id: id,
      filename: row.filename,
      text: `Asset "${row.shortFilename}" was updated.`,
    });

    return this.formatAsset(row);
  }

  async uploadAssets(spaceId: number, files: Express.Multer.File[], folderId?: number | null) {
    const results = await Promise.all(
      files.map(async (file) => {
        const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `${spaceId}/${id}-${safeName}`;
        const filename = `/f/${spaceId}/${id}-${safeName}`;

        await this.storage.putObject(key, file.buffer, file.mimetype);

        const [row] = await this.db
          .insert(assets)
          .values({
            id,
            spaceId,
            filename,
            shortFilename: safeName,
            contentType: file.mimetype,
            contentLength: file.size,
            folderId: folderId ?? null,
            metaData: {},
          })
          .returning();

        void this.webhooks.dispatch(spaceId, WEBHOOK_ACTIONS.ASSET_CREATED, {
          action: 'asset_created',
          space_id: spaceId,
          asset_id: row.id,
          filename: row.filename,
          text: `Asset "${safeName}" was uploaded.`,
        });

        return this.formatAsset(row);
      }),
    );

    return { assets: results };
  }

  async replaceAsset(id: number, spaceId: number, file: Express.Multer.File) {
    const [existing] = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.spaceId, spaceId)));
    ResultGuard.throwIfNotFound(existing, 'Asset not found');

    // Derive key from existing filename: /f/{spaceId}/key → {spaceId}/key
    const key = existing.filename.replace(/^\/f\//, '');

    await this.storage.putObject(key, file.buffer, file.mimetype);

    const [row] = await this.db
      .update(assets)
      .set({
        contentType: file.mimetype,
        contentLength: file.size,
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, id), eq(assets.spaceId, spaceId)))
      .returning();

    return this.formatAsset(row);
  }

  async softDeleteAsset(id: number, spaceId: number) {
    const [row] = await this.db
      .update(assets)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.spaceId, spaceId), isNull(assets.deletedAt)))
      .returning();
    ResultGuard.throwIfNotFound(row, 'Asset not found');

    void this.webhooks.dispatch(spaceId, WEBHOOK_ACTIONS.ASSET_DELETED, {
      action: 'asset_deleted',
      space_id: spaceId,
      asset_id: id,
      filename: row.filename,
      text: `Asset "${row.shortFilename}" was deleted.`,
    });

    return this.formatAsset(row);
  }

  async restoreAsset(id: number, spaceId: number) {
    const [row] = await this.db
      .update(assets)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.spaceId, spaceId), isNotNull(assets.deletedAt)))
      .returning();
    ResultGuard.throwIfNotFound(row, 'Deleted asset not found');
    return this.formatAsset(row);
  }

  async getTotalCount(spaceId: number) {
    const [activeResult] = await this.db
      .select({ total: count() })
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), isNull(assets.deletedAt)));
    const [deletedResult] = await this.db
      .select({ total: count() })
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), isNotNull(assets.deletedAt)));
    return {
      total: Number(activeResult?.total ?? 0),
      deleted: Number(deletedResult?.total ?? 0),
    };
  }

  async bulkUpdate(spaceId: number, ids: number[], assetFolderId: number) {
    if (!ids.length) return;
    await this.db
      .update(assets)
      .set({ folderId: assetFolderId, updatedAt: new Date() })
      .where(and(eq(assets.spaceId, spaceId), inArray(assets.id, ids)));
  }

  async bulkDestroy(spaceId: number, ids: number[]) {
    if (!ids.length) return;
    await this.db
      .update(assets)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(assets.spaceId, spaceId), inArray(assets.id, ids), isNull(assets.deletedAt)));
  }

  async bulkRestore(spaceId: number, ids: number[]) {
    if (!ids.length) return;
    await this.db
      .update(assets)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(
        and(eq(assets.spaceId, spaceId), inArray(assets.id, ids), isNotNull(assets.deletedAt)),
      );
  }

  async generateAltText(assetId: number, spaceId: number): Promise<{ alt_text: string }> {
    // Load asset
    const [asset] = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.spaceId, spaceId)))
      .limit(1);
    ResultGuard.throwIfNotFound(asset, 'Asset not found');

    // Only image assets can have alt text generated
    if (!asset.contentType?.startsWith('image/')) {
      throw new BadRequestException('Alt text generation is only supported for images');
    }

    // Load active AI configuration and branding rule
    const config = await this.aiConfigurations.getActiveConfigWithCredentials(spaceId);
    if (!config)
      throw new BadRequestException(
        'AI is not configured for this space. Configure a provider in Settings → AI Settings.',
      );
    const branding = await this.aiConfigurations.getActiveBrandingRule(spaceId);

    // Normalize filename (handles migrated Storyblok URLs), then strip /f/ to get MinIO key
    const normalizedFilename = this.normalizeFilename(asset.filename);
    const storageKey = normalizedFilename.replace(/^\/f\//, '');

    let imageBuffer: Buffer;
    const file = await this.storage.getObject(storageKey);
    if (file) {
      imageBuffer = file.body;
    } else {
      // Fallback to Storyblok origin for assets not yet migrated to local storage
      const originUrl = `https://a.storyblok.com/f/${storageKey}`;
      const response = await fetch(originUrl);
      if (!response.ok) throw new NotFoundException('Asset file not found in storage or origin');
      imageBuffer = Buffer.from(await response.arrayBuffer());
    }

    const altText = await this.ai.generateAltText(
      config,
      branding,
      imageBuffer,
      asset.contentType,
      spaceId,
    );
    return { alt_text: altText };
  }

  private normalizeFilename(filename: string): string {
    // Migrated assets may have S3/Storyblok URLs like:
    //   https://s3.amazonaws.com/a.storyblok.com/f/285923/path/img.jpg
    //   https://a.storyblok.com/f/285923/path/img.jpg
    // Normalize them to our CDN path format: /f/{spaceId}/path/img.jpg
    const match = filename.match(/\/f\/(\d+)\/(.+)$/);
    if (!match) return filename;
    return `/f/${match[1]}/${match[2]}`;
  }

  private formatFolder(f: typeof assetFolders.$inferSelect, idToUuid: Map<number, string>) {
    return {
      id: f.id,
      name: f.name,
      parent_id: f.parentId,
      parent_uuid: f.parentId ? (idToUuid.get(f.parentId) ?? null) : null,
      uuid: f.uuid,
    };
  }

  private formatAsset(a: typeof assets.$inferSelect) {
    const filename = this.normalizeFilename(a.filename);
    const metaData = (a.metaData as Record<string, unknown>) ?? {};
    // Parse dimensions from filename if not stored in meta_data
    // Storyblok encodes dimensions as /f/{spaceId}/{width}x{height}/{hash}/name
    if (!metaData.width && !metaData.height) {
      const dimMatch = filename.match(/\/f\/\d+\/(\d+)x(\d+)\//);
      if (dimMatch) {
        metaData.width = parseInt(dimMatch[1], 10);
        metaData.height = parseInt(dimMatch[2], 10);
      }
    }
    return {
      id: a.id,
      space_id: a.spaceId,
      filename,
      short_filename: a.shortFilename,
      content_type: a.contentType,
      content_length: a.contentLength,
      alt: a.alt,
      title: a.title,
      copyright: a.copyright,
      source: null,
      focus: a.focus,
      asset_folder_id: a.folderId,
      locked: a.locked,
      expire_at: a.expireAt,
      publish_at: null,
      is_private: false,
      ext_id: null,
      meta_data: metaData,
      deleted_at: a.deletedAt,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
      internal_tags_list: a.internalTagsList,
      internal_tag_ids: a.internalTagIds,
    };
  }
}
