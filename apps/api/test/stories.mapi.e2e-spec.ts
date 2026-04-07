import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, stories } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TEST_SPACE_ID = 999001;
const TEST_TOKEN = 'test-stories-mapi-token';

describe('Stories MAPI (e2e)', () => {
  let app: INestApplication;
  let db: DbType;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get<DbType>(DB);

    // Clean up any leftover test data
    await db.delete(stories).where(eq(stories.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    // Seed test space
    await db.insert(spaces).values({
      id: TEST_SPACE_ID,
      uuid: 'test-space-uuid-999001',
      name: 'Test Space Stories MAPI',
      defaultLang: 'default',
    });

    // Seed management token
    const tokenId = TEST_SPACE_ID * 1000 + 1;
    await db.insert(apiTokens).values({
      id: tokenId,
      spaceId: TEST_SPACE_ID,
      name: 'Test Management Token',
      token: TEST_TOKEN,
      tokenType: 'management',
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(stories).where(eq(stories.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    await app.close();
  });

  describe('GET /v1/spaces/:spaceId/stories', () => {
    it('returns 401 without token', async () => {
      return request(app.getHttpServer()).get(`/v1/spaces/${TEST_SPACE_ID}/stories`).expect(401);
    });

    it('returns list of stories', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('stories');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.stories)).toBe(true);
    });
  });

  describe('POST /v1/spaces/:spaceId/stories', () => {
    it('creates a story', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}`)
        .send({
          story: {
            name: 'Test Story',
            slug: 'test-story',
            content: { component: 'page', body: [] },
            tag_list: ['tag1', 'tag2'],
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty('story');
      expect(res.body.story).toHaveProperty('id');
      expect(res.body.story.name).toBe('Test Story');
      expect(res.body.story.slug).toBe('test-story');
    });

    it('creates and publishes a story when publish=true', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}`)
        .send({
          story: {
            name: 'Published Story',
            slug: 'published-story',
            content: { component: 'page' },
          },
          publish: true,
        })
        .expect(201);

      expect(res.body).toHaveProperty('story');
      expect(res.body.story.published).toBe(true);
    });
  });

  describe('GET /v1/spaces/:spaceId/stories/:id', () => {
    let storyId: number;

    beforeAll(async () => {
      // Create a story to use in get tests
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}`)
        .send({
          story: { name: 'Get Test Story', slug: 'get-test-story' },
        });
      storyId = res.body.story.id;
    });

    it('returns a single story by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/stories/${storyId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('story');
      expect(res.body.story.id).toBe(storyId);
      expect(res.body.story.name).toBe('Get Test Story');
    });

    it('returns 404 for non-existent story', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/stories/999999999?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:spaceId/stories/:id', () => {
    let storyId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}`)
        .send({
          story: { name: 'Update Test Story', slug: 'update-test-story' },
        });
      storyId = res.body.story.id;
    });

    it('updates a story', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/stories/${storyId}?token=${TEST_TOKEN}`)
        .send({
          story: {
            name: 'Updated Story Name',
            content: { component: 'page', title: 'Hello' },
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('story');
      expect(res.body.story.name).toBe('Updated Story Name');
    });

    it('updates and publishes a story when publish=true', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/stories/${storyId}?token=${TEST_TOKEN}`)
        .send({
          story: { name: 'Updated And Published' },
          publish: true,
        })
        .expect(200);

      expect(res.body).toHaveProperty('story');
      expect(res.body.story.published).toBe(true);
    });
  });

  describe('POST /v1/spaces/:spaceId/stories/:id/publish', () => {
    let storyId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}`)
        .send({
          story: { name: 'Publish Test Story', slug: 'publish-test-story' },
        });
      storyId = res.body.story.id;
    });

    it('publishes a story', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/stories/${storyId}/publish?token=${TEST_TOKEN}`)
        .expect(201);

      expect(res.body).toHaveProperty('story');
      expect(res.body.story.published).toBe(true);
    });
  });

  describe('POST /v1/spaces/:spaceId/stories/:id/unpublish', () => {
    let storyId: number;

    beforeAll(async () => {
      // Create and publish a story
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}`)
        .send({
          story: { name: 'Unpublish Test Story', slug: 'unpublish-test-story' },
          publish: true,
        });
      storyId = res.body.story.id;
    });

    it('unpublishes a story', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/stories/${storyId}/unpublish?token=${TEST_TOKEN}`)
        .expect(201);

      expect(res.body).toHaveProperty('story');
      expect(res.body.story.published).toBe(false);
    });
  });

  describe('DELETE /v1/spaces/:spaceId/stories/:id', () => {
    let storyId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}`)
        .send({
          story: { name: 'Delete Test Story', slug: 'delete-test-story' },
        });
      storyId = res.body.story.id;
    });

    it('deletes a story and returns 200 with empty object', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${TEST_SPACE_ID}/stories/${storyId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 after deletion', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/stories/${storyId}?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });

  describe('List with filters', () => {
    beforeAll(async () => {
      // Create a folder and a child story for filter tests
      const folderRes = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}`)
        .send({
          story: { name: 'Filter Folder', slug: 'filter-folder', is_folder: true },
        });

      const folderId = folderRes.body.story.id;

      await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}`)
        .send({
          story: {
            name: 'Child Story',
            slug: 'child-story',
            parent_id: folderId,
            content: { component: 'article' },
          },
        });
    });

    it('filters root stories with with_parent=0', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}&with_parent=0`)
        .expect(200);

      expect(res.body.stories.every((s: any) => s.parent_id === null)).toBe(true);
    });

    it('filters by content_type', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}&content_type=article`)
        .expect(200);

      expect(res.body.stories.length).toBeGreaterThan(0);
      expect(res.body.stories.every((s: any) => s.content_type === 'article')).toBe(true);
    });

    it('filters by search', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/stories?token=${TEST_TOKEN}&search=Child`)
        .expect(200);

      expect(res.body.stories.length).toBeGreaterThan(0);
      expect(res.body.stories[0].name).toContain('Child');
    });
  });
});
