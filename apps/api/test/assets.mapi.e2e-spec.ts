import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DB } from './../src/db/db.module';
import { spaces, apiTokens, assets, assetFolders } from './../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const SPACE_ID = 999002;
const TOKEN = 'test-assets-mapi-token';

describe('Assets MAPI (e2e)', () => {
  let app: INestApplication<App>;
  let db: any;
  let testFolderId: number;
  let testAssetId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DB);

    // Seed space
    await db
      .insert(spaces)
      .values({
        id: SPACE_ID,
        uuid: `test-assets-mapi-space-uuid`,
        name: 'Test Assets MAPI Space',
      })
      .onConflictDoNothing();

    // Seed token
    const tokenId = SPACE_ID * 1000 + 1;
    await db
      .insert(apiTokens)
      .values({
        id: tokenId,
        spaceId: SPACE_ID,
        name: 'Test MAPI Token',
        token: TOKEN,
        tokenType: 'management',
      })
      .onConflictDoNothing();

    // Seed a folder
    testFolderId = SPACE_ID * 1000 + 2;
    await db
      .insert(assetFolders)
      .values({
        id: testFolderId,
        spaceId: SPACE_ID,
        name: 'Test Folder',
        uuid: `test-folder-uuid-${testFolderId}`,
      })
      .onConflictDoNothing();

    // Seed an asset
    testAssetId = SPACE_ID * 1000 + 3;
    await db
      .insert(assets)
      .values({
        id: testAssetId,
        spaceId: SPACE_ID,
        filename: `/f/${SPACE_ID}/test-${testAssetId}.jpg`,
        shortFilename: 'test.jpg',
        contentType: 'image/jpeg',
        contentLength: 1000,
        metaData: {},
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    // Clean up in dependency order
    await db.delete(assets).where(eq(assets.spaceId, SPACE_ID));
    await db.delete(assetFolders).where(eq(assetFolders.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));
    await app.close();
  });

  // ─── Asset Folders ───────────────────────────────────────────────────────────

  describe('GET /v1/spaces/:spaceId/asset_folders', () => {
    it('returns 200 with asset_folders array', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/asset_folders?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('asset_folders');
      expect(Array.isArray(res.body.asset_folders)).toBe(true);
      expect(res.body.asset_folders.length).toBeGreaterThan(0);
    });
  });

  describe('POST /v1/spaces/:spaceId/asset_folders', () => {
    it('returns 201 and creates a folder', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/asset_folders?token=${TOKEN}`)
        .send({ asset_folder: { name: 'New E2E Folder' } })
        .expect(201);

      expect(res.body).toHaveProperty('asset_folder');
      expect(res.body.asset_folder.name).toBe('New E2E Folder');
      expect(res.body.asset_folder.id).toBeDefined();
    });
  });

  describe('GET /v1/spaces/:spaceId/asset_folders/:id', () => {
    it('returns 200 with single folder', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/asset_folders/${testFolderId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('asset_folder');
      expect(res.body.asset_folder.id).toBe(testFolderId);
      expect(res.body.asset_folder.name).toBe('Test Folder');
    });

    it('returns 404 for nonexistent folder', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/asset_folders/99999999999?token=${TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:spaceId/asset_folders/:id', () => {
    it('returns 200 and updates folder name', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/asset_folders/${testFolderId}?token=${TOKEN}`)
        .send({ asset_folder: { name: 'Updated Folder Name' } })
        .expect(200);

      expect(res.body).toHaveProperty('asset_folder');
      expect(res.body.asset_folder.name).toBe('Updated Folder Name');
    });
  });

  describe('DELETE /v1/spaces/:spaceId/asset_folders/:id', () => {
    it('returns 200 and deletes folder', async () => {
      // Create a temporary folder to delete
      const tmpFolderId = SPACE_ID * 1000 + 10;
      await db.insert(assetFolders).values({
        id: tmpFolderId,
        spaceId: SPACE_ID,
        name: 'Temp Delete Folder',
        uuid: `tmp-folder-uuid-${tmpFolderId}`,
      });

      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${SPACE_ID}/asset_folders/${tmpFolderId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });
  });

  // ─── Assets ─────────────────────────────────────────────────────────────────

  describe('GET /v1/spaces/:spaceId/assets', () => {
    it('returns 200 with assets array and total', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/assets?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('assets');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.assets)).toBe(true);
    });

    it('supports pagination params', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/assets?token=${TOKEN}&page=1&per_page=10`)
        .expect(200);

      expect(res.body.assets.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /v1/spaces/:spaceId/assets/:id', () => {
    it('returns 200 with single asset', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/assets/${testAssetId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('asset');
      expect(res.body.asset.id).toBe(testAssetId);
    });

    it('returns 404 for nonexistent asset', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/assets/99999999999?token=${TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:spaceId/assets/:id', () => {
    it('returns 200 and updates asset metadata', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/assets/${testAssetId}?token=${TOKEN}`)
        .send({ asset: { title: 'My Test Title', alt: 'Alt text' } })
        .expect(200);

      expect(res.body).toHaveProperty('asset');
      expect(res.body.asset.title).toBe('My Test Title');
      expect(res.body.asset.alt).toBe('Alt text');
    });
  });

  describe('DELETE /v1/spaces/:spaceId/assets/:id', () => {
    it('returns 200 and soft-deletes asset', async () => {
      // Create a temporary asset to soft-delete
      const tmpAssetId = SPACE_ID * 1000 + 20;
      await db.insert(assets).values({
        id: tmpAssetId,
        spaceId: SPACE_ID,
        filename: `/f/${SPACE_ID}/tmp-${tmpAssetId}.jpg`,
        shortFilename: 'tmp.jpg',
        contentType: 'image/jpeg',
        contentLength: 500,
        metaData: {},
      });

      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${SPACE_ID}/assets/${tmpAssetId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });
  });
});
