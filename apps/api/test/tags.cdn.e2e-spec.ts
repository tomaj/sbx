import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, tags, stories } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const SPACE_ID = 999022;
const TOKEN = 'test-tags-cdn-token';
const BASE = '/v2/cdn/tags';

describe('Tags CDN (e2e)', () => {
  let app: INestApplication;
  let db: DbType;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DbType>(DB);

    await db.delete(stories).where(eq(stories.spaceId, SPACE_ID));
    await db.delete(tags).where(eq(tags.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));

    await db.insert(spaces).values({
      id: SPACE_ID,
      uuid: `test-cdn-tags-space-${SPACE_ID}`,
      name: 'Test CDN Tags Space',
    });

    await db.insert(apiTokens).values({
      id: SPACE_ID * 1000 + 1,
      spaceId: SPACE_ID,
      name: 'Public',
      token: TOKEN,
      tokenType: 'public',
    });

    // Seed tags
    await db.insert(tags).values([
      { spaceId: SPACE_ID, name: 'news', taggingsCount: 5 },
      { spaceId: SPACE_ID, name: 'tech', taggingsCount: 3 },
      { spaceId: SPACE_ID, name: 'sport', taggingsCount: 1 },
    ]);

    // Seed stories with tag_list for starts_with tests
    const baseId = BigInt(SPACE_ID) * 100000n;
    const now = new Date();
    await db.insert(stories).values([
      {
        id: baseId + 1n,
        spaceId: SPACE_ID,
        uuid: crypto.randomUUID(),
        name: 'Blog Post A',
        slug: 'post-a',
        fullSlug: 'blog/post-a',
        groupId: crypto.randomUUID(),
        contentType: 'article',
        isFolder: false,
        isStartpage: false,
        published: true,
        unpublishedChanges: false,
        position: 1,
        tagList: ['news', 'tech'],
        content: { component: 'article', _uid: crypto.randomUUID() },
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        firstPublishedAt: now,
      },
      {
        id: baseId + 2n,
        spaceId: SPACE_ID,
        uuid: crypto.randomUUID(),
        name: 'Root Post',
        slug: 'root-post',
        fullSlug: 'root-post',
        groupId: crypto.randomUUID(),
        contentType: 'page',
        isFolder: false,
        isStartpage: false,
        published: true,
        unpublishedChanges: false,
        position: 2,
        tagList: ['sport'],
        content: { component: 'page', _uid: crypto.randomUUID() },
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        firstPublishedAt: now,
      },
      {
        id: baseId + 3n,
        spaceId: SPACE_ID,
        uuid: crypto.randomUUID(),
        name: 'Draft Blog Post',
        slug: 'draft-post',
        fullSlug: 'blog/draft-post',
        groupId: crypto.randomUUID(),
        contentType: 'article',
        isFolder: false,
        isStartpage: false,
        published: false,
        unpublishedChanges: false,
        position: 3,
        tagList: ['news'],
        content: { component: 'article', _uid: crypto.randomUUID() },
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        firstPublishedAt: null,
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(stories).where(eq(stories.spaceId, SPACE_ID));
    await db.delete(tags).where(eq(tags.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));
    await app.close();
  });

  describe('auth', () => {
    it('returns 401 without token', () => {
      return request(app.getHttpServer()).get(BASE).expect(401);
    });
  });

  describe('GET /v2/cdn/tags', () => {
    it('returns tags array', async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}?token=${TOKEN}`).expect(200);

      expect(res.body).toHaveProperty('tags');
      expect(Array.isArray(res.body.tags)).toBe(true);
      expect(res.body.tags.length).toBeGreaterThan(0);
    });

    it('tag object has name and taggings_count', async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}?token=${TOKEN}`).expect(200);

      const tag = res.body.tags[0];
      expect(tag).toHaveProperty('name');
      expect(tag).toHaveProperty('taggings_count');
      expect(typeof tag.name).toBe('string');
      expect(typeof tag.taggings_count).toBe('number');
    });

    it('tags are sorted alphabetically', async () => {
      const res = await request(app.getHttpServer()).get(`${BASE}?token=${TOKEN}`).expect(200);

      const names = res.body.tags.map((t: any) => t.name);
      expect(names).toEqual([...names].sort());
    });

    describe('starts_with filter', () => {
      it('returns only tags from stories with matching slug prefix', async () => {
        const res = await request(app.getHttpServer())
          .get(`${BASE}?token=${TOKEN}&starts_with=blog/`)
          .expect(200);

        // blog/post-a (published) has tags: news, tech
        // blog/draft-post (draft) excluded in published version
        const names = res.body.tags.map((t: any) => t.name);
        expect(names).toContain('news');
        expect(names).toContain('tech');
        // sport is only on root-post which doesn't start with blog/
        expect(names).not.toContain('sport');
      });

      it('returns tags from draft stories when version=draft', async () => {
        const res = await request(app.getHttpServer())
          .get(`${BASE}?token=${TOKEN}&starts_with=blog/&version=draft`)
          .expect(200);

        // blog/draft-post (draft, tagList: ['news']) is now included
        const names = res.body.tags.map((t: any) => t.name);
        expect(names).toContain('news');
      });

      it('returns empty tags for non-matching prefix', async () => {
        const res = await request(app.getHttpServer())
          .get(`${BASE}?token=${TOKEN}&starts_with=nonexistent/`)
          .expect(200);

        expect(res.body.tags).toEqual([]);
      });
    });
  });
});
