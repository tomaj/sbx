import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, workflowStageChanges } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TEST_SPACE_ID = 999016;
const TEST_TOKEN = 'test-wsc-mapi-token';

describe('WorkflowStageChanges MAPI (e2e)', () => {
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
    await db.delete(workflowStageChanges).where(eq(workflowStageChanges.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    // Seed test space
    await db.insert(spaces).values({
      id: TEST_SPACE_ID,
      uuid: 'test-space-uuid-999016',
      name: 'Test Space WorkflowStageChanges MAPI',
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
    await db.delete(workflowStageChanges).where(eq(workflowStageChanges.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    await app.close();
  });

  describe('GET /v1/spaces/:spaceId/workflow_stage_changes', () => {
    it('returns 401 without token', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/workflow_stage_changes`)
        .expect(401);
    });

    it('returns list of workflow stage changes', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/workflow_stage_changes?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('workflow_stage_changes');
      expect(Array.isArray(res.body.workflow_stage_changes)).toBe(true);
    });
  });

  describe('POST /v1/spaces/:spaceId/workflow_stage_changes', () => {
    it('creates a workflow stage change', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/workflow_stage_changes?token=${TEST_TOKEN}`)
        .send({
          workflow_stage_change: {
            workflow_stage_id: 42,
            story_id: 1001,
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty('workflow_stage_change');
      expect(res.body.workflow_stage_change).toHaveProperty('id');
      expect(res.body.workflow_stage_change.workflow_stage_id).toBe(42);
      expect(res.body.workflow_stage_change.story_id).toBe(1001);
      expect(res.body.workflow_stage_change.space_id).toBe(TEST_SPACE_ID);
    });
  });

  describe('GET /v1/spaces/:spaceId/workflow_stage_changes with filter', () => {
    let storyId: number;

    beforeAll(async () => {
      storyId = 2002;
      await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/workflow_stage_changes?token=${TEST_TOKEN}`)
        .send({
          workflow_stage_change: {
            workflow_stage_id: 10,
            story_id: storyId,
          },
        });
    });

    it('returns changes filtered by story id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/workflow_stage_changes?token=${TEST_TOKEN}&with_story=${storyId}`)
        .expect(200);

      expect(res.body).toHaveProperty('workflow_stage_changes');
      expect(Array.isArray(res.body.workflow_stage_changes)).toBe(true);
      expect(res.body.workflow_stage_changes.length).toBeGreaterThan(0);
      expect(res.body.workflow_stage_changes.every((c: any) => c.story_id === storyId)).toBe(true);
    });
  });
});
