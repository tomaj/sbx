import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, webhookEndpoints } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TEST_SPACE_ID = 999012;
const TEST_TOKEN = 'test-webhooks-mapi-token';

describe('Webhooks MAPI (e2e)', () => {
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
    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    // Seed test space
    await db.insert(spaces).values({
      id: TEST_SPACE_ID,
      uuid: `test-space-uuid-${TEST_SPACE_ID}`,
      name: 'Test Space Webhooks MAPI',
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
    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    await app.close();
  });

  describe('GET /v1/spaces/:spaceId/webhook_endpoints', () => {
    it('returns 401 without token', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints`)
        .expect(401);
    });

    it('returns list of webhooks', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('webhook_endpoints');
      expect(Array.isArray(res.body.webhook_endpoints)).toBe(true);
    });
  });

  describe('POST /v1/spaces/:spaceId/webhook_endpoints', () => {
    it('creates a webhook endpoint', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints?token=${TEST_TOKEN}`)
        .send({
          webhook_endpoint: {
            name: 'Test Webhook',
            endpoint: 'https://example.com/hook',
            description: 'A test webhook',
            secret: 'mysecret',
            actions: ['publish', 'unpublish'],
            activated: true,
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty('webhook_endpoint');
      expect(res.body.webhook_endpoint).toHaveProperty('id');
      expect(res.body.webhook_endpoint.name).toBe('Test Webhook');
      expect(res.body.webhook_endpoint.endpoint).toBe('https://example.com/hook');
      expect(res.body.webhook_endpoint.actions).toEqual(['publish', 'unpublish']);
      expect(res.body.webhook_endpoint.activated).toBe(true);
    });

    it('creates a webhook with minimal fields', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints?token=${TEST_TOKEN}`)
        .send({
          webhook_endpoint: {
            name: 'Minimal Webhook',
            endpoint: 'https://example.com/minimal',
          },
        })
        .expect(201);

      expect(res.body.webhook_endpoint.name).toBe('Minimal Webhook');
      expect(res.body.webhook_endpoint.actions).toEqual([]);
    });
  });

  describe('GET /v1/spaces/:spaceId/webhook_endpoints/:id', () => {
    let webhookId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints?token=${TEST_TOKEN}`)
        .send({
          webhook_endpoint: {
            name: 'Get Test Webhook',
            endpoint: 'https://example.com/get',
          },
        });
      webhookId = res.body.webhook_endpoint.id;
    });

    it('returns a single webhook by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints/${webhookId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('webhook_endpoint');
      expect(res.body.webhook_endpoint.id).toBe(webhookId);
      expect(res.body.webhook_endpoint.name).toBe('Get Test Webhook');
    });

    it('returns 404 for non-existent webhook', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints/999999999?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:spaceId/webhook_endpoints/:id', () => {
    let webhookId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints?token=${TEST_TOKEN}`)
        .send({
          webhook_endpoint: {
            name: 'Update Test Webhook',
            endpoint: 'https://example.com/update',
            actions: ['publish'],
          },
        });
      webhookId = res.body.webhook_endpoint.id;
    });

    it('updates a webhook', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints/${webhookId}?token=${TEST_TOKEN}`)
        .send({
          webhook_endpoint: {
            name: 'Updated Webhook Name',
            actions: ['publish', 'unpublish', 'delete'],
            activated: false,
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('webhook_endpoint');
      expect(res.body.webhook_endpoint.name).toBe('Updated Webhook Name');
      expect(res.body.webhook_endpoint.actions).toEqual(['publish', 'unpublish', 'delete']);
      expect(res.body.webhook_endpoint.activated).toBe(false);
    });

    it('returns 404 for non-existent webhook', async () => {
      return request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints/999999999?token=${TEST_TOKEN}`)
        .send({ webhook_endpoint: { name: 'Ghost' } })
        .expect(404);
    });
  });

  describe('DELETE /v1/spaces/:spaceId/webhook_endpoints/:id', () => {
    let webhookId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints?token=${TEST_TOKEN}`)
        .send({
          webhook_endpoint: {
            name: 'Delete Test Webhook',
            endpoint: 'https://example.com/delete',
          },
        });
      webhookId = res.body.webhook_endpoint.id;
    });

    it('deletes a webhook and returns 200 with empty object', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints/${webhookId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 after deletion', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/webhook_endpoints/${webhookId}?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });
});
