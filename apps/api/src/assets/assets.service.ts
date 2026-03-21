import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, count, eq, ilike, isNull, isNotNull, or } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { assets, assetFolders } from '../db/schema';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AssetsService {
  constructor(
    @Inject(DB) private db: DbType,
    private readonly storage: StorageService,
  ) {}

  // ─── Folders ────────────────────────────────────────────────────────────────

  async listFolders(spaceId: number) {
    const rows = await this.db
      .select()
      .from(assetFolders)
      .where(eq(assetFolders.spaceId, spaceId))
      .orderBy(asc(assetFolders.name));

    return {
      asset_folders: rows.map((f) => ({
        id: f.id,
        name: f.name,
        parent_id: f.parentId,
        uuid: f.uuid,
        created_at: f.createdAt,
        updated_at: f.updatedAt,
      })),
    };
  }

  async createFolder(spaceId: number, data: { name: string; parent_id?: number | null }) {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const uuid = crypto.randomUUID();
    const [row] = await this.db
      .insert(assetFolders)
      .values({
        id,
        spaceId,
        name: data.name,
        parentId: data.parent_id ?? null,
        uuid,
      })
      .returning();
    return {
      id: row.id,
      name: row.name,
      parent_id: row.parentId,
      uuid: row.uuid,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async updateFolder(id: number, spaceId: number, data: { name?: string; parent_id?: number | null }) {
    const [row] = await this.db
      .update(assetFolders)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.parent_id !== undefined ? { parentId: data.parent_id } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(assetFolders.id, id), eq(assetFolders.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Folder not found');
    return {
      id: row.id,
      name: row.name,
      parent_id: row.parentId,
      uuid: row.uuid,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  async deleteFolder(id: number, spaceId: number) {
    const [row] = await this.db
      .delete(assetFolders)
      .where(and(eq(assetFolders.id, id), eq(assetFolders.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Folder not found');
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
    },
  ) {
    const { page, perPage, search, folderId, sortField, sortDir, deleted, contentType } = opts;

    const conditions: any[] = [eq(assets.spaceId, spaceId)];

    if (deleted) {
      conditions.push(isNotNull(assets.deletedAt));
    } else {
      conditions.push(isNull(assets.deletedAt));
    }

    if (search) {
      conditions.push(
        or(
          ilike(assets.filename, `%${search}%`),
          ilike(assets.shortFilename, `%${search}%`),
          ilike(assets.alt, `%${search}%`),
          ilike(assets.title, `%${search}%`),
        ),
      );
    }

    if (folderId !== undefined && folderId !== null) {
      conditions.push(eq(assets.folderId, folderId));
    } else if (folderId === null) {
      conditions.push(isNull(assets.folderId));
    }

    if (contentType) {
      conditions.push(ilike(assets.contentType, `${contentType}%`));
    }

    const where = and(...conditions);

    let orderCol: any;
    switch (sortField) {
      case 'created_at': orderCol = assets.createdAt; break;
      case 'updated_at': orderCol = assets.updatedAt; break;
      case 'filename': orderCol = assets.shortFilename; break;
      case 'content_length': orderCol = assets.contentLength; break;
      default: orderCol = assets.createdAt;
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
      assets: rows.map(this.formatAsset),
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
    if (!row) throw new NotFoundException('Asset not found');
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

    const [row] = await this.db
      .update(assets)
      .set(updates)
      .where(and(eq(assets.id, id), eq(assets.spaceId, spaceId)))
      .returning();
    if (!row) throw new NotFoundException('Asset not found');
    return this.formatAsset(row);
  }

  async uploadAssets(
    spaceId: number,
    files: Express.Multer.File[],
    folderId?: number | null,
  ) {
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
    if (!existing) throw new NotFoundException('Asset not found');

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
    if (!row) throw new NotFoundException('Asset not found');
    return { deleted: true };
  }

  async restoreAsset(id: number, spaceId: number) {
    const [row] = await this.db
      .update(assets)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.spaceId, spaceId), isNotNull(assets.deletedAt)))
      .returning();
    if (!row) throw new NotFoundException('Deleted asset not found');
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

  private formatAsset(a: typeof assets.$inferSelect) {
    return {
      id: a.id,
      filename: a.filename,
      short_filename: a.shortFilename,
      content_type: a.contentType,
      content_length: a.contentLength,
      alt: a.alt,
      title: a.title,
      copyright: a.copyright,
      focus: a.focus,
      folder_id: a.folderId,
      locked: a.locked,
      expire_at: a.expireAt,
      is_external_url: a.isExternalUrl,
      meta_data: a.metaData,
      deleted_at: a.deletedAt,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    };
  }
}
