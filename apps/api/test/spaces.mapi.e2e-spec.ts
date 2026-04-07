import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TEST_SPACE_ID = 999015;
const TEST_TOKEN = 'test-spaces-mapi-token';

describe('Spaces MAPI (e2e)', () => {
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
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    // Seed test space
    await db.insert(spaces).values({
      id: TEST_SPACE_ID,
      uuid: `test-space-uuid-mapi-${TEST_SPACE_ID}`,
      name: 'Test Space MAPI',
      defaultLang: 'default',
      domain: 'https://test.example.com',
    });

    // Seed management token
    const tokenId = TEST_SPACE_ID * 1000 + 2;
    await db.insert(apiTokens).values({
      id: tokenId,
      spaceId: TEST_SPACE_ID,
      name: 'Test Spaces Management Token',
      token: TEST_TOKEN,
      tokenType: 'management',
    });
  });

  afterAll(async () => {
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    await app.close();
  });

  describe('GET /v1/spaces', () => {
    it('returns 401 without token', () => {
      return request(app.getHttpServer()).get('/v1/spaces').expect(401);
    });

    it('returns list of spaces', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('spaces');
      expect(Array.isArray(res.body.spaces)).toBe(true);
      expect(res.body.spaces.length).toBeGreaterThan(0);

      const testSpace = res.body.spaces.find((s: any) => s.id === TEST_SPACE_ID);
      expect(testSpace).toBeDefined();
      expect(testSpace.name).toBe('Test Space MAPI');
    });
  });

  describe('GET /v1/spaces/:id', () => {
    it('returns a single space', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('space');
      expect(res.body.space.id).toBe(TEST_SPACE_ID);
      expect(res.body.space.name).toBe('Test Space MAPI');
      expect(res.body.space.domain).toBe('https://test.example.com');
    });

    it('returns 404 for non-existent space', () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/999999999?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:id', () => {
    it('updates a space', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}?token=${TEST_TOKEN}`)
        .send({
          space: {
            name: 'Updated Test Space MAPI',
            domain: 'https://updated.example.com',
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('space');
      expect(res.body.space.name).toBe('Updated Test Space MAPI');
      expect(res.body.space.domain).toBe('https://updated.example.com');
    });

    it('returns 404 for non-existent space', () => {
      return request(app.getHttpServer())
        .put(`/v1/spaces/999999999?token=${TEST_TOKEN}`)
        .send({ space: { name: 'x' } })
        .expect(404);
    });
  });
});
