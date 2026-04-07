import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, stories } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const SPACE_ID = 999021;
const TOKEN = 'test-links-cdn-token';
const BASE = '/v2/cdn/links';

function storyRow(id: bigint, overrides: Record<string, any> = {}) {
  return {
    id,
    spaceId: SPACE_ID,
    uuid: crypto.randomUUID(),
    name: 'Story',
    slug: 'story',
    fullSlug: 'story',
    path: null,
    parentId: null,
    groupId: crypto.randomUUID(),
    contentType: 'page',
    isFolder: false,
    isStartpage: false,
    published: true,
    unpublishedChanges: false,
    position: 0,
    tagList: [],
    content: { component: 'page', _uid: crypto.randomUUID() },
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
    firstPublishedAt: new Date(),
    ...overrides,
  };
}

describe('Links CDN (e2e)', () => {
  let app: INestApplication;
  let db: DbType;

  let rootFolderUuid: string;
  let rootStoryUuid: string;
  let childStoryUuid: string;
  let draftStoryUuid: string;
  let rootFolderId: bigint;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DbType>(DB);

    await db.delete(stories).where(eq(stories.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));

    await db.insert(spaces).values({
      id: SPACE_ID,
      uuid: `test-cdn-links-space-${SPACE_ID}`,
      name: 'Test CDN Links Space',
      version: 1700000001,
    });

    await db.insert(apiTokens).values({
      id: SPACE_ID * 1000 + 1,
      spaceId: SPACE_ID,
      name: 'Public',
      token: TOKEN,
      tokenType: 'public',
    });

    const baseId = BigInt(SPACE_ID) * 100000n;

    rootFolderUuid = crypto.randomUUID();
    rootFolderId = baseId + 1n;
    await db.insert(stories).values(
      storyRow(rootFolderId, {
        uuid: rootFolderUuid,
        name: 'Blog',
        slug: 'blog',
        fullSlug: 'blog/',
        isFolder: true,
        isStartpage: false,
        published: true,
        position: 10,
      }),
    );

    rootStoryUuid = crypto.randomUUID();
    await db.insert(stories).values(
      storyRow(baseId + 2n, {
        uuid: rootStoryUuid,
        name: 'Home',
        slug: 'home',
        fullSlug: 'home',
        path: 'custom-home/',
        published: true,
        position: 5,
      }),
    );

    childStoryUuid = crypto.randomUUID();
    await db.insert(stories).values(
      storyRow(baseId + 3n, {
        uuid: childStoryUuid,
        name: 'Post One',
        slug: 'post-one',
        fullSlug: 'blog/post-one',
        parentId: rootFolderId,
        published: true,
        position: 20,
      }),
    );

    draftStoryUuid = crypto.randomUUID();
    await db.insert(stories).values(
      storyRow(baseId + 4n, {
        uuid: draftStoryUuid,
        name: 'Draft Post',
        slug: 'draft-post',
        fullSlug: 'blog/draft-post',
        parentId: rootFolderId,
        published: false,
        publishedAt: null,
        firstPublishedAt: null,
        position: 30,
      }),
    );
  });

  afterAll(async () => {
    await db.delete(stories).where(eq(stories.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));
    await app.close();
  });

  describe('auth', () => {
    it('returns 401 without token', () => {
      return request(app.getHttpServer()).get(BASE).expect(401);
    });
  });

  describe('GET /v2/cdn/links', () => {
    it('returns links as object keyed by UUID', async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}?token=${TOKEN}`).expect(200);

      expect(res.body).toHaveProperty('links');
      expect(res.body).not.toHaveProperty('cv');
      expect(typeof res.body.links).toBe('object');
      expect(Array.isArray(res.body.links)).toBe(false);
    });

    it('includes folders in links', async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}?token=${TOKEN}`).expect(200);

      const folder = res.body.links[rootFolderUuid];
      expect(folder).toBeDefined();
      expect(folder.is_folder).toBe(true);
      expect(folder.slug).toBe('blog/');
    });

    it('includes stories in links', async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}?token=${TOKEN}`).expect(200);

      const story = res.body.links[rootStoryUuid];
      expect(story).toBeDefined();
      expect(story.is_folder).toBe(false);
    });

    it('link object has correct fields', async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}?token=${TOKEN}`).expect(200);

      const link = res.body.links[rootStoryUuid];
      expect(link).toHaveProperty('id');
      expect(link).toHaveProperty('uuid', rootStoryUuid);
      expect(link).toHaveProperty('slug');
      expect(link).toHaveProperty('path');
      expect(link).toHaveProperty('parent_id');
      expect(link).toHaveProperty('name', 'Home');
      expect(link).toHaveProperty('is_folder', false);
      expect(link).toHaveProperty('published', true);
      expect(link).toHaveProperty('is_startpage');
      expect(link).toHaveProperty('position');
      expect(link).toHaveProperty('real_path');
    });

    it('real_path uses path field when set', async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}?token=${TOKEN}`).expect(200);

      const link = res.body.links[rootStoryUuid];
      // story has path='custom-home/'
      expect(link.real_path).toBe('/custom-home/');
    });

    it('real_path uses slug when path is empty', async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}?token=${TOKEN}`).expect(200);

      const link = res.body.links[childStoryUuid];
      // child has no path, slug='post-one'
      expect(link.real_path).toBe('/post-one');
    });

    it('excludes unpublished in default version', async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}?token=${TOKEN}`).expect(200);

      expect(res.body.links[draftStoryUuid]).toBeUndefined();
    });

    it('includes unpublished with version=draft', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${TOKEN}&version=draft`)
        .expect(200);

      expect(res.body.links[draftStoryUuid]).toBeDefined();
    });

    it('filters by starts_with', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${TOKEN}&starts_with=blog/`)
        .expect(200);

      const slugs = Object.values(res.body.links).map((l: any) => l.slug);
      expect(slugs.every((s: string) => s.startsWith('blog/'))).toBe(true);
      expect(slugs).not.toContain('home');
    });

    it('filters by with_parent=0 returns root items', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${TOKEN}&with_parent=0`)
        .expect(200);

      const links = Object.values(res.body.links);
      expect(links.every((l: any) => l.parent_id === null)).toBe(true);
    });

    it('filters by with_parent=<id> returns children', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${TOKEN}&with_parent=${Number(rootFolderId)}`)
        .expect(200);

      const links = Object.values(res.body.links);
      expect(links.length).toBeGreaterThan(0);
      expect(links.every((l: any) => l.parent_id === Number(rootFolderId))).toBe(true);
    });

    it('does not include date fields without include_dates', async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}?token=${TOKEN}`).expect(200);

      const link = res.body.links[rootStoryUuid];
      expect(link.created_at).toBeUndefined();
      expect(link.updated_at).toBeUndefined();
      expect(link.published_at).toBeUndefined();
    });

    it('includes date fields with include_dates=1', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${TOKEN}&include_dates=1`)
        .expect(200);

      const link = res.body.links[rootStoryUuid];
      expect(link.created_at).toBeDefined();
      expect(link.updated_at).toBeDefined();
      expect(link).toHaveProperty('published_at');
    });

    it('paginates with per_page', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${TOKEN}&per_page=2&page=1`)
        .expect(200);

      expect(Object.keys(res.body.links).length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /v2/cdn/links/:uuid', () => {
    it('returns single link by UUID', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/${rootStoryUuid}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('link');
      expect(res.body).not.toHaveProperty('cv');
      expect(res.body.link[rootStoryUuid]).toBeDefined();
      expect(res.body.link[rootStoryUuid].name).toBe('Home');
    });

    it('includes date fields in single link response', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/${rootStoryUuid}?token=${TOKEN}`)
        .expect(200);

      const link = res.body.link[rootStoryUuid];
      expect(link.created_at).toBeDefined();
      expect(link.updated_at).toBeDefined();
    });

    it('returns 404 for non-existent UUID', async () => {
      return request(app.getHttpServer())
        .get(`${BASE}/00000000-0000-0000-0000-000000000000?token=${TOKEN}`)
        .expect(404);
    });
  });
});
