import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const SPACE_ID = 999024;
const TOKEN = 'test-spaces-cdn-token';

describe('Spaces CDN (e2e)', () => {
  let app: INestApplication;
  let db: DbType;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DbType>(DB);

    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));

    await db.insert(spaces).values({
      id: SPACE_ID,
      uuid: `test-cdn-spaces-space-${SPACE_ID}`,
      name: 'Test CDN Spaces Space',
      domain: 'https://example.com',
      version: 1700000003,
      languageCodes: ['sk', 'en'],
    });

    await db.insert(apiTokens).values({
      id: SPACE_ID * 1000 + 1,
      spaceId: SPACE_ID,
      name: 'Public',
      token: TOKEN,
      tokenType: 'public',
    });
  });

  afterAll(async () => {
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));
    await app.close();
  });

  describe('auth', () => {
    it('returns 401 without token', () => {
      return request(app.getHttpServer()).get('/v2/cdn/spaces/me').expect(401);
    });

    it('returns 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/v2/cdn/spaces/me?token=bad-token')
        .expect(401);
    });
  });

  describe('GET /v2/cdn/spaces/me', () => {
    it('returns space info', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/spaces/me?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('space');
      const space = res.body.space;
      expect(space).toHaveProperty('id', SPACE_ID);
      expect(space).toHaveProperty('name', 'Test CDN Spaces Space');
      expect(space).toHaveProperty('domain', 'https://example.com');
      expect(space).toHaveProperty('version', 1700000003);
      expect(space).toHaveProperty('language_codes');
      expect(Array.isArray(space.language_codes)).toBe(true);
      expect(space.language_codes).toContain('sk');
      expect(space.language_codes).toContain('en');
    });
  });
});
