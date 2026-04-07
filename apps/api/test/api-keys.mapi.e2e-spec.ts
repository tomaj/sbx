import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DB } from './../src/db/db.module';
import { spaces, apiTokens } from './../src/db/schema';
import { eq } from 'drizzle-orm';

const SPACE_ID = 999009;
const TOKEN = 'test-apikeys-mapi-token';

describe('API Keys MAPI (e2e)', () => {
  let app: INestApplication<App>;
  let db: any;
  let testKeyId: number;

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
        uuid: `test-apikeys-mapi-space-uuid-${SPACE_ID}`,
        name: 'Test API Keys MAPI Space',
      })
      .onConflictDoNothing();

    const tokenId = SPACE_ID * 1000 + 1;
    await db
      .insert(apiTokens)
      .values({
        id: tokenId,
        spaceId: SPACE_ID,
        name: 'Test API Keys MAPI Token',
        token: TOKEN,
        tokenType: 'management',
      })
      .onConflictDoNothing();

    // Seed an extra api key for update/delete tests
    const seedId = SPACE_ID * 1000 + 2;
    const [key] = await db
      .insert(apiTokens)
      .values({
        id: seedId,
        spaceId: SPACE_ID,
        name: 'Seed Key',
        token: `seed-key-token-${seedId}`,
        tokenType: 'public',
      })
      .returning();
    testKeyId = Number(key.id);
  });

  afterAll(async () => {
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));
    await app.close();
  });

  describe('GET /v1/spaces/:spaceId/api_keys', () => {
    it('returns 200 with api_keys array', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/api_keys?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('api_keys');
      expect(Array.isArray(res.body.api_keys)).toBe(true);
      expect(res.body.api_keys.length).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/spaces/:spaceId/api_keys/:id', () => {
    it('returns 200 with single api key', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/api_keys/${testKeyId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('api_key');
      expect(res.body.api_key.id).toBe(testKeyId);
    });

    it('returns 404 for nonexistent key', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/api_keys/99999999?token=${TOKEN}`)
        .expect(404);
    });
  });

  describe('POST /v1/spaces/:spaceId/api_keys', () => {
    it('returns 201 and creates an api key', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/api_keys?token=${TOKEN}`)
        .send({ api_key: { name: 'New E2E Key', token_type: 'public' } })
        .expect(201);

      expect(res.body).toHaveProperty('api_key');
      expect(res.body.api_key.name).toBe('New E2E Key');
      expect(res.body.api_key.id).toBeDefined();
      expect(res.body.api_key.token).toBeDefined();
    });
  });

  describe('PUT /v1/spaces/:spaceId/api_keys/:id', () => {
    it('returns 200 and updates an api key name', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/api_keys/${testKeyId}?token=${TOKEN}`)
        .send({ api_key: { name: 'Updated Key Name' } })
        .expect(200);

      expect(res.body).toHaveProperty('api_key');
      expect(res.body.api_key.name).toBe('Updated Key Name');
    });

    it('returns 404 for nonexistent key', async () => {
      await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/api_keys/99999999?token=${TOKEN}`)
        .send({ api_key: { name: 'ghost' } })
        .expect(404);
    });
  });

  describe('DELETE /v1/spaces/:spaceId/api_keys/:id', () => {
    it('returns 200 and deletes the api key', async () => {
      const tmpId = SPACE_ID * 1000 + 3;
      await db
        .insert(apiTokens)
        .values({
          id: tmpId,
          spaceId: SPACE_ID,
          name: 'Key To Delete',
          token: `key-to-delete-${tmpId}`,
          tokenType: 'public',
        })
        .onConflictDoNothing();

      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${SPACE_ID}/api_keys/${tmpId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });
  });
});
