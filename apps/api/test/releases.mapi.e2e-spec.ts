import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, releases } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TEST_SPACE_ID = 999006;
const TEST_TOKEN = 'test-releases-mapi-token';

describe('Releases MAPI (e2e)', () => {
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
    await db.delete(releases).where(eq(releases.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    // Seed test space
    await db.insert(spaces).values({
      id: TEST_SPACE_ID,
      uuid: 'test-space-uuid-999006',
      name: 'Test Space Releases MAPI',
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
    await db.delete(releases).where(eq(releases.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    await app.close();
  });

  describe('GET /v1/spaces/:spaceId/releases', () => {
    it('returns 401 without token', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/releases`)
        .expect(401);
    });

    it('returns list of releases', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/releases?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('releases');
      expect(Array.isArray(res.body.releases)).toBe(true);
    });
  });

  describe('POST /v1/spaces/:spaceId/releases', () => {
    it('creates a release', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/releases?token=${TEST_TOKEN}`)
        .send({
          release: {
            name: 'Test Release',
            release_at: '2026-06-01T10:00:00.000Z',
            timezone: 'Europe/Bratislava',
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty('release');
      expect(res.body.release).toHaveProperty('id');
      expect(res.body.release).toHaveProperty('uuid');
      expect(res.body.release.name).toBe('Test Release');
      expect(res.body.release.timezone).toBe('Europe/Bratislava');
      expect(res.body.release.space_id).toBe(TEST_SPACE_ID);
    });

    it('creates a release without optional fields', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/releases?token=${TEST_TOKEN}`)
        .send({
          release: { name: 'Minimal Release' },
        })
        .expect(201);

      expect(res.body.release.name).toBe('Minimal Release');
      expect(res.body.release.release_at).toBeNull();
    });
  });

  describe('GET /v1/spaces/:spaceId/releases/:id', () => {
    let releaseId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/releases?token=${TEST_TOKEN}`)
        .send({ release: { name: 'Get Test Release' } });
      releaseId = res.body.release.id;
    });

    it('returns a single release by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/releases/${releaseId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('release');
      expect(res.body.release.id).toBe(releaseId);
      expect(res.body.release.name).toBe('Get Test Release');
    });

    it('returns 404 for non-existent release', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/releases/999999999?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:spaceId/releases/:id', () => {
    let releaseId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/releases?token=${TEST_TOKEN}`)
        .send({ release: { name: 'Update Test Release' } });
      releaseId = res.body.release.id;
    });

    it('updates a release', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/releases/${releaseId}?token=${TEST_TOKEN}`)
        .send({
          release: {
            name: 'Updated Release Name',
            timezone: 'UTC',
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('release');
      expect(res.body.release.name).toBe('Updated Release Name');
      expect(res.body.release.timezone).toBe('UTC');
    });

    it('returns 404 for non-existent release', async () => {
      return request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/releases/999999999?token=${TEST_TOKEN}`)
        .send({ release: { name: 'Ghost' } })
        .expect(404);
    });
  });

  describe('DELETE /v1/spaces/:spaceId/releases/:id', () => {
    let releaseId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/releases?token=${TEST_TOKEN}`)
        .send({ release: { name: 'Delete Test Release' } });
      releaseId = res.body.release.id;
    });

    it('deletes a release and returns 200 with empty object', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${TEST_SPACE_ID}/releases/${releaseId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 after deletion', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/releases/${releaseId}?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });
});
