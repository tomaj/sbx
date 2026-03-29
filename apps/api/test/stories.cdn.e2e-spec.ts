import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, stories } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const SPACE_ID = 999020;
const PUBLIC_TOKEN = 'test-stories-cdn-public-token';
const PREVIEW_TOKEN = 'test-stories-cdn-preview-token';
const BASE = '/v2/cdn/stories';

// Helper to build story rows (id is required)
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

describe('Stories CDN (e2e)', () => {
  let app: INestApplication;
  let db: DbType;

  // seeded story IDs for cross-test reference
  let publishedStoryId: bigint;
  let draftStoryId: bigint;
  let blogStory1Id: bigint;
  let blogStory2Id: bigint;
  let articleStoryId: bigint;
  let taggedStoryId: bigint;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DbType>(DB);

    // Clean up
    await db.delete(stories).where(eq(stories.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));

    // Seed space
    await db.insert(spaces).values({
      id: SPACE_ID,
      uuid: `test-cdn-stories-space-${SPACE_ID}`,
      name: 'Test CDN Stories Space',
      version: 1700000000,
    });

    // Seed tokens
    await db.insert(apiTokens).values([
      { id: SPACE_ID * 1000 + 1, spaceId: SPACE_ID, name: 'Public', token: PUBLIC_TOKEN, tokenType: 'public' },
      { id: SPACE_ID * 1000 + 2, spaceId: SPACE_ID, name: 'Preview', token: PREVIEW_TOKEN, tokenType: 'private' },
    ]);

    // Seed stories
    const baseId = BigInt(SPACE_ID) * 100000n;

    publishedStoryId = baseId + 1n;
    await db.insert(stories).values(storyRow(publishedStoryId, {
      name: 'Published Story',
      slug: 'published-story',
      fullSlug: 'published-story',
      content: { component: 'page', _uid: 'uid-pub', title: 'Hello World' },
      published: true,
      contentType: 'page',
      position: 10,
    }));

    draftStoryId = baseId + 2n;
    await db.insert(stories).values(storyRow(draftStoryId, {
      name: 'Draft Story',
      slug: 'draft-story',
      fullSlug: 'draft-story',
      content: { component: 'page', _uid: 'uid-draft' },
      published: false,
      publishedAt: null,
      firstPublishedAt: null,
      position: 20,
    }));

    blogStory1Id = baseId + 3n;
    await db.insert(stories).values(storyRow(blogStory1Id, {
      name: 'Blog Post 1',
      slug: 'post-1',
      fullSlug: 'blog/post-1',
      content: { component: 'article', _uid: 'uid-blog1', priority: '5' },
      published: true,
      contentType: 'article',
      position: 30,
      tagList: ['news', 'tech'],
    }));

    blogStory2Id = baseId + 4n;
    await db.insert(stories).values(storyRow(blogStory2Id, {
      name: 'Blog Post 2',
      slug: 'post-2',
      fullSlug: 'blog/post-2',
      content: { component: 'article', _uid: 'uid-blog2', priority: '10' },
      published: true,
      contentType: 'article',
      position: 40,
      tagList: ['news'],
    }));

    articleStoryId = baseId + 5n;
    await db.insert(stories).values(storyRow(articleStoryId, {
      name: 'Featured Article',
      slug: 'featured',
      fullSlug: 'blog/featured',
      content: { component: 'article', _uid: 'uid-feat' },
      published: true,
      contentType: 'article',
      isStartpage: true,
      position: 5,
    }));

    taggedStoryId = baseId + 6n;
    await db.insert(stories).values(storyRow(taggedStoryId, {
      name: 'Tagged Story',
      slug: 'tagged',
      fullSlug: 'tagged',
      published: true,
      tagList: ['special'],
      position: 50,
    }));
  });

  afterAll(async () => {
    await db.delete(stories).where(eq(stories.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));
    await app.close();
  });

  // ── Auth ─────────────────────────────────────────────────────────────────────

  describe('auth', () => {
    it('returns 401 without token', () => {
      return request(app.getHttpServer()).get(BASE).expect(401);
    });

    it('returns 401 with invalid token', () => {
      return request(app.getHttpServer()).get(`${BASE}?token=invalid`).expect(401);
    });
  });

  // ── GET /v2/cdn/stories ───────────────────────────────────────────────────

  describe('GET /v2/cdn/stories', () => {
    it('returns only published stories with public token', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('stories');
      expect(res.body).toHaveProperty('cv', 1700000000);
      expect(res.body).toHaveProperty('rels');
      expect(res.body).toHaveProperty('links');
      expect(Array.isArray(res.body.stories)).toBe(true);

      const slugs = res.body.stories.map((s: any) => s.full_slug);
      expect(slugs).not.toContain('draft-story');
      expect(slugs).toContain('published-story');
    });

    it('includes drafts with version=draft', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PREVIEW_TOKEN}&version=draft`)
        .expect(200);

      const slugs = res.body.stories.map((s: any) => s.full_slug);
      expect(slugs).toContain('draft-story');
    });

    it('story object has expected fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}`)
        .expect(200);

      const s = res.body.stories.find((x: any) => x.full_slug === 'published-story');
      expect(s).toBeDefined();
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('uuid');
      expect(s).toHaveProperty('name', 'Published Story');
      expect(s).toHaveProperty('slug', 'published-story');
      expect(s).toHaveProperty('full_slug', 'published-story');
      expect(s).toHaveProperty('content');
      expect(s).toHaveProperty('created_at');
      expect(s).toHaveProperty('updated_at');
      expect(s).toHaveProperty('published_at');
      expect(s).toHaveProperty('first_published_at');
      expect(s).toHaveProperty('lang', 'default');
      expect(s).toHaveProperty('alternates');
    });

    it('filters by starts_with', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&starts_with=blog/`)
        .expect(200);

      const slugs = res.body.stories.map((s: any) => s.full_slug);
      expect(slugs.every((s: string) => s.startsWith('blog/'))).toBe(true);
      expect(slugs).not.toContain('published-story');
    });

    it('filters by content_type', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&content_type=article`)
        .expect(200);

      expect(res.body.stories.length).toBeGreaterThan(0);
      const allArticles = res.body.stories.every(
        (s: any) => s.content.component === 'article',
      );
      expect(allArticles).toBe(true);
    });

    it('filters by level', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&level=1`)
        .expect(200);

      // Level 1 = root stories (no slashes in full_slug)
      const slugs = res.body.stories.map((s: any) => s.full_slug);
      expect(slugs.every((s: string) => !s.includes('/'))).toBe(true);
      expect(slugs).toContain('published-story');
      expect(slugs).not.toContain('blog/post-1');
    });

    it('filters by level=2', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&level=2`)
        .expect(200);

      const slugs = res.body.stories.map((s: any) => s.full_slug);
      expect(slugs).toContain('blog/post-1');
      expect(slugs).not.toContain('published-story');
    });

    it('filters by with_tag', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&with_tag=special`)
        .expect(200);

      expect(res.body.stories.length).toBeGreaterThan(0);
      expect(res.body.stories[0].full_slug).toBe('tagged');
    });

    it('filters by is_startpage=1', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&is_startpage=1`)
        .expect(200);

      expect(res.body.stories.every((s: any) => s.is_startpage === true)).toBe(true);
    });

    it('filters by is_startpage=0', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&is_startpage=0`)
        .expect(200);

      expect(res.body.stories.every((s: any) => s.is_startpage === false)).toBe(true);
    });

    it('filters by search_term', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&search_term=Featured`)
        .expect(200);

      expect(res.body.stories.length).toBeGreaterThan(0);
      expect(res.body.stories[0].name).toContain('Featured');
    });

    it('filters by by_slugs', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&by_slugs=blog/post-1,blog/post-2`)
        .expect(200);

      expect(res.body.stories.length).toBe(2);
      const slugs = res.body.stories.map((s: any) => s.full_slug);
      expect(slugs).toContain('blog/post-1');
      expect(slugs).toContain('blog/post-2');
    });

    it('filters by by_slugs with wildcard', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&by_slugs=blog/*`)
        .expect(200);

      const slugs = res.body.stories.map((s: any) => s.full_slug);
      expect(slugs.every((s: string) => s.startsWith('blog/'))).toBe(true);
    });

    it('filters by by_uuids', async () => {
      const [row] = await db
        .select({ uuid: stories.uuid })
        .from(stories)
        .where(eq(stories.id, publishedStoryId));

      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&by_uuids=${row.uuid}`)
        .expect(200);

      expect(res.body.stories.length).toBe(1);
      expect(res.body.stories[0].uuid).toBe(row.uuid);
    });

    it('returns stories in order of by_uuids_ordered', async () => {
      const [r1] = await db.select({ uuid: stories.uuid }).from(stories).where(eq(stories.id, blogStory1Id));
      const [r2] = await db.select({ uuid: stories.uuid }).from(stories).where(eq(stories.id, blogStory2Id));

      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&by_uuids_ordered=${r2.uuid},${r1.uuid}`)
        .expect(200);

      expect(res.body.stories.length).toBe(2);
      expect(res.body.stories[0].uuid).toBe(r2.uuid);
      expect(res.body.stories[1].uuid).toBe(r1.uuid);
    });

    it('excludes by excluding_slugs', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&excluding_slugs=published-story`)
        .expect(200);

      const slugs = res.body.stories.map((s: any) => s.full_slug);
      expect(slugs).not.toContain('published-story');
    });

    it('excludes by excluding_ids', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&excluding_ids=${Number(publishedStoryId)}`)
        .expect(200);

      const ids = res.body.stories.map((s: any) => s.id);
      expect(ids).not.toContain(Number(publishedStoryId));
    });

    it('paginates results', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&per_page=2&page=1`)
        .expect(200);

      expect(res.body.stories.length).toBeLessThanOrEqual(2);
    });

    it('sorts by name:asc', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&sort_by=name:asc`)
        .expect(200);

      const names = res.body.stories.map((s: any) => s.name);
      expect(names).toEqual([...names].sort());
    });

    it('sorts by name:desc', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&sort_by=name:desc`)
        .expect(200);

      const names = res.body.stories.map((s: any) => s.name);
      expect(names).toEqual([...names].sort().reverse());
    });

    it('excludes fields with excluding_fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}?token=${PUBLIC_TOKEN}&excluding_fields=content,tag_list`)
        .expect(200);

      expect(res.body.stories.every((s: any) => s.content === undefined)).toBe(true);
      expect(res.body.stories.every((s: any) => s.tag_list === undefined)).toBe(true);
    });

    describe('filter_query', () => {
      it('filters by content field with in operator', async () => {
        const res = await request(app.getHttpServer())
          .get(`${BASE}?token=${PUBLIC_TOKEN}&filter_query[component][in]=article`)
          .expect(200);

        expect(res.body.stories.length).toBeGreaterThan(0);
        expect(
          res.body.stories.every((s: any) => s.content.component === 'article'),
        ).toBe(true);
      });

      it('filters by content field with not_in operator', async () => {
        const res = await request(app.getHttpServer())
          .get(`${BASE}?token=${PUBLIC_TOKEN}&filter_query[component][not_in]=article`)
          .expect(200);

        expect(
          res.body.stories.every((s: any) => s.content.component !== 'article'),
        ).toBe(true);
      });

      it('filters by content field with like operator', async () => {
        const res = await request(app.getHttpServer())
          .get(`${BASE}?token=${PUBLIC_TOKEN}&filter_query[component][like]=arti*`)
          .expect(200);

        expect(res.body.stories.length).toBeGreaterThan(0);
      });

      it('filters by content field with gt_int operator', async () => {
        const res = await request(app.getHttpServer())
          .get(`${BASE}?token=${PUBLIC_TOKEN}&filter_query[priority][gt_int]=6`)
          .expect(200);

        // Only blog/post-2 has priority=10 which is > 6
        expect(res.body.stories.length).toBe(1);
        expect(res.body.stories[0].full_slug).toBe('blog/post-2');
      });

      it('filters by content field with lt_int operator', async () => {
        const res = await request(app.getHttpServer())
          .get(`${BASE}?token=${PUBLIC_TOKEN}&filter_query[priority][lt_int]=6`)
          .expect(200);

        // Only blog/post-1 has priority=5 which is < 6
        expect(res.body.stories.length).toBe(1);
        expect(res.body.stories[0].full_slug).toBe('blog/post-1');
      });
    });

    describe('date range filters', () => {
      it('filters by published_at_gt', async () => {
        const past = new Date(Date.now() - 86400000).toISOString(); // yesterday
        const res = await request(app.getHttpServer())
          .get(`${BASE}?token=${PUBLIC_TOKEN}&published_at_gt=${past}`)
          .expect(200);

        expect(Array.isArray(res.body.stories)).toBe(true);
        // All returned stories should have published_at after yesterday
        res.body.stories.forEach((s: any) => {
          if (s.published_at) {
            expect(new Date(s.published_at).getTime()).toBeGreaterThan(
              new Date(past).getTime(),
            );
          }
        });
      });

      it('filters by updated_at_lt in far future returns all', async () => {
        const future = new Date(Date.now() + 86400000 * 365).toISOString();
        const res = await request(app.getHttpServer())
          .get(`${BASE}?token=${PUBLIC_TOKEN}&updated_at_lt=${future}`)
          .expect(200);

        expect(res.body.stories.length).toBeGreaterThan(0);
      });
    });
  });

  // ── GET /v2/cdn/stories/:slug ─────────────────────────────────────────────

  describe('GET /v2/cdn/stories/:slug', () => {
    it('returns single story by full_slug', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/published-story?token=${PUBLIC_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('story');
      expect(res.body.story.full_slug).toBe('published-story');
      expect(res.body).toHaveProperty('cv', 1700000000);
      expect(res.body).toHaveProperty('rels');
      expect(res.body).toHaveProperty('links');
    });

    it('returns story by numeric ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/${Number(publishedStoryId)}?token=${PUBLIC_TOKEN}`)
        .expect(200);

      expect(res.body.story.id).toBe(Number(publishedStoryId));
    });

    it('returns story by UUID with find_by=uuid', async () => {
      const [row] = await db
        .select({ uuid: stories.uuid })
        .from(stories)
        .where(eq(stories.id, publishedStoryId));

      const res = await request(app.getHttpServer())
        .get(`${BASE}/${row.uuid}?token=${PUBLIC_TOKEN}&find_by=uuid`)
        .expect(200);

      expect(res.body.story.uuid).toBe(row.uuid);
    });

    it('returns story nested by slug path', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/blog/post-1?token=${PUBLIC_TOKEN}`)
        .expect(200);

      expect(res.body.story.full_slug).toBe('blog/post-1');
    });

    it('returns 404 for non-existent story', async () => {
      return request(app.getHttpServer())
        .get(`${BASE}/does-not-exist?token=${PUBLIC_TOKEN}`)
        .expect(404);
    });

    it('returns 404 for draft story with public version', async () => {
      return request(app.getHttpServer())
        .get(`${BASE}/draft-story?token=${PUBLIC_TOKEN}`)
        .expect(404);
    });

    it('returns draft story with version=draft', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/draft-story?token=${PREVIEW_TOKEN}&version=draft`)
        .expect(200);

      expect(res.body.story.full_slug).toBe('draft-story');
    });

    it('adds _editable metadata in draft version', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/published-story?token=${PREVIEW_TOKEN}&version=draft`)
        .expect(200);

      expect(res.body.story.content._editable).toMatch(/<!--#storyblok#/);
    });
  });
});
