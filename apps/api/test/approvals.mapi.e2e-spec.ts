import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, approvals } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TEST_SPACE_ID = 999017;
const TEST_TOKEN = 'test-approvals-mapi-token';

describe('Approvals MAPI (e2e)', () => {
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
    await db.delete(approvals).where(eq(approvals.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    // Seed test space
    await db.insert(spaces).values({
      id: TEST_SPACE_ID,
      uuid: 'test-space-uuid-999017',
      name: 'Test Space Approvals MAPI',
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
    await db.delete(approvals).where(eq(approvals.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    await app.close();
  });

  describe('GET /v1/spaces/:spaceId/approvals', () => {
    it('returns 401 without token', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/approvals`)
        .expect(401);
    });

    it('returns list of approvals', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/approvals?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('approvals');
      expect(Array.isArray(res.body.approvals)).toBe(true);
    });
  });

  describe('POST /v1/spaces/:spaceId/approvals', () => {
    it('creates an approval', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/approvals?token=${TEST_TOKEN}`)
        .send({
          approval: {
            approver_id: 55,
            story_id: 3001,
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty('approval');
      expect(res.body.approval).toHaveProperty('id');
      expect(res.body.approval.approver_id).toBe(55);
      expect(res.body.approval.story_id).toBe(3001);
      expect(res.body.approval.space_id).toBe(TEST_SPACE_ID);
      expect(res.body.approval.status).toBe('pending');
    });
  });

  describe('GET /v1/spaces/:spaceId/approvals/:id', () => {
    let approvalId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/approvals?token=${TEST_TOKEN}`)
        .send({ approval: { approver_id: 66, story_id: 4001 } });
      approvalId = res.body.approval.id;
    });

    it('returns a single approval by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/approvals/${approvalId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('approval');
      expect(res.body.approval.id).toBe(approvalId);
      expect(res.body.approval.approver_id).toBe(66);
    });

    it('returns 404 for non-existent approval', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/approvals/999999999?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });

  describe('DELETE /v1/spaces/:spaceId/approvals/:id', () => {
    let approvalId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/approvals?token=${TEST_TOKEN}`)
        .send({ approval: { approver_id: 77, story_id: 5001 } });
      approvalId = res.body.approval.id;
    });

    it('deletes an approval and returns 200 with empty object', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${TEST_SPACE_ID}/approvals/${approvalId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 after deletion', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/approvals/${approvalId}?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });
});
