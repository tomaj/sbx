import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DB } from './../src/db/db.module';
import { spaces, apiTokens, tags } from './../src/db/schema';
import { eq } from 'drizzle-orm';

const SPACE_ID = 999007;
const TOKEN = 'test-misc-mapi-token';

describe('Tags MAPI (e2e)', () => {
  let app: INestApplication<App>;
  let db: any;
  let testTagId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DB);

    await db
      .insert(spaces)
      .values({
        id: SPACE_ID,
        uuid: `test-tags-mapi-space-uuid-${SPACE_ID}`,
        name: 'Test Tags MAPI Space',
      })
      .onConflictDoNothing();

    const tokenId = SPACE_ID * 1000 + 1;
    await db
      .insert(apiTokens)
      .values({
        id: tokenId,
        spaceId: SPACE_ID,
        name: 'Test Tags MAPI Token',
        token: TOKEN,
        tokenType: 'management',
      })
      .onConflictDoNothing();

    // Seed a tag
    const [tag] = await db
      .insert(tags)
      .values({ spaceId: SPACE_ID, name: 'seed-tag' })
      .onConflictDoNothing()
      .returning();
    if (tag) {
      testTagId = tag.id;
    } else {
      const [existing] = await db.select().from(tags).where(eq(tags.spaceId, SPACE_ID)).limit(1);
      testTagId = existing.id;
    }
  });

  afterAll(async () => {
    await db.delete(tags).where(eq(tags.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));
    await app.close();
  });

  describe('GET /v1/spaces/:spaceId/tags', () => {
    it('returns 200 with tags array including id and created_at', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/tags?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('tags');
      expect(Array.isArray(res.body.tags)).toBe(true);
      expect(res.body.tags.length).toBeGreaterThan(0);
      const tag = res.body.tags[0];
      expect(tag).toHaveProperty('id');
      expect(tag).toHaveProperty('name');
      expect(tag).toHaveProperty('taggings_count');
      expect(tag).toHaveProperty('created_at');
    });
  });

  describe('POST /v1/spaces/:spaceId/tags', () => {
    it('returns 201 and creates a tag', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/tags?token=${TOKEN}`)
        .send({ tag: { name: 'new-e2e-tag' } })
        .expect(201);

      expect(res.body).toHaveProperty('tag');
      expect(res.body.tag.name).toBe('new-e2e-tag');
      expect(res.body.tag.id).toBeDefined();
    });
  });

  describe('PUT /v1/spaces/:spaceId/tags/:id', () => {
    it('returns 200 and updates a tag', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/tags/${testTagId}?token=${TOKEN}`)
        .send({ tag: { name: 'updated-tag-name' } })
        .expect(200);

      expect(res.body).toHaveProperty('tag');
      expect(res.body.tag.name).toBe('updated-tag-name');
      expect(res.body.tag.id).toBe(testTagId);
    });

    it('returns 404 for nonexistent tag', async () => {
      await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/tags/99999999?token=${TOKEN}`)
        .send({ tag: { name: 'ghost' } })
        .expect(404);
    });
  });

  describe('DELETE /v1/spaces/:spaceId/tags/:id', () => {
    it('returns 200 and deletes the tag', async () => {
      // Create a temporary tag to delete
      const [tmp] = await db
        .insert(tags)
        .values({ spaceId: SPACE_ID, name: 'tag-to-delete' })
        .returning();

      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${SPACE_ID}/tags/${tmp.id}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 for nonexistent tag', async () => {
      await request(app.getHttpServer())
        .delete(`/v1/spaces/${SPACE_ID}/tags/99999999?token=${TOKEN}`)
        .expect(404);
    });
  });
});
