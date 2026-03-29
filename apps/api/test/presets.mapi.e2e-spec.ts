import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, presets } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TEST_SPACE_ID = 999013;
const TEST_TOKEN = 'test-presets-mapi-token';
const TEST_COMPONENT_ID = 88801;

describe('Presets MAPI (e2e)', () => {
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
    await db.delete(presets).where(eq(presets.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    // Seed test space
    await db.insert(spaces).values({
      id: TEST_SPACE_ID,
      uuid: `test-space-uuid-${TEST_SPACE_ID}`,
      name: 'Test Space Presets MAPI',
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
    await db.delete(presets).where(eq(presets.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    await app.close();
  });

  describe('GET /v1/spaces/:spaceId/presets', () => {
    it('returns 401 without token', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/presets`)
        .expect(401);
    });

    it('returns list of presets', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/presets?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('presets');
      expect(Array.isArray(res.body.presets)).toBe(true);
    });
  });

  describe('POST /v1/spaces/:spaceId/presets', () => {
    it('creates a preset', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/presets?token=${TEST_TOKEN}`)
        .send({
          preset: {
            name: 'Test Preset',
            component_id: TEST_COMPONENT_ID,
            preset: { headline: 'Hello World' },
            image: 'https://example.com/img.png',
            color: '#ff0000',
            icon: 'star',
            description: 'A test preset',
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty('preset');
      expect(res.body.preset).toHaveProperty('id');
      expect(res.body.preset.name).toBe('Test Preset');
      expect(res.body.preset.component_id).toBe(TEST_COMPONENT_ID);
      expect(res.body.preset.preset).toEqual({ headline: 'Hello World' });
      expect(res.body.preset.color).toBe('#ff0000');
    });

    it('creates a preset with minimal fields', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/presets?token=${TEST_TOKEN}`)
        .send({
          preset: {
            name: 'Minimal Preset',
            component_id: TEST_COMPONENT_ID,
          },
        })
        .expect(201);

      expect(res.body.preset.name).toBe('Minimal Preset');
      expect(res.body.preset.preset).toEqual({});
    });
  });

  describe('GET /v1/spaces/:spaceId/presets/:id', () => {
    let presetId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/presets?token=${TEST_TOKEN}`)
        .send({
          preset: {
            name: 'Get Test Preset',
            component_id: TEST_COMPONENT_ID,
          },
        });
      presetId = res.body.preset.id;
    });

    it('returns a single preset by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/presets/${presetId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('preset');
      expect(res.body.preset.id).toBe(presetId);
      expect(res.body.preset.name).toBe('Get Test Preset');
    });

    it('returns 404 for non-existent preset', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/presets/999999999?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:spaceId/presets/:id', () => {
    let presetId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/presets?token=${TEST_TOKEN}`)
        .send({
          preset: {
            name: 'Update Test Preset',
            component_id: TEST_COMPONENT_ID,
            preset: { title: 'Original' },
          },
        });
      presetId = res.body.preset.id;
    });

    it('updates a preset', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/presets/${presetId}?token=${TEST_TOKEN}`)
        .send({
          preset: {
            name: 'Updated Preset Name',
            preset: { title: 'Updated' },
            color: '#00ff00',
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('preset');
      expect(res.body.preset.name).toBe('Updated Preset Name');
      expect(res.body.preset.preset).toEqual({ title: 'Updated' });
      expect(res.body.preset.color).toBe('#00ff00');
    });

    it('returns 404 for non-existent preset', async () => {
      return request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/presets/999999999?token=${TEST_TOKEN}`)
        .send({ preset: { name: 'Ghost' } })
        .expect(404);
    });
  });

  describe('DELETE /v1/spaces/:spaceId/presets/:id', () => {
    let presetId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/presets?token=${TEST_TOKEN}`)
        .send({
          preset: {
            name: 'Delete Test Preset',
            component_id: TEST_COMPONENT_ID,
          },
        });
      presetId = res.body.preset.id;
    });

    it('deletes a preset and returns 200 with empty object', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${TEST_SPACE_ID}/presets/${presetId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 after deletion', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/presets/${presetId}?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });
});
