import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, workflows, workflowStages } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TEST_SPACE_ID = 999011;
const TEST_TOKEN = 'test-workflows-mapi-token';

describe('Workflows MAPI (e2e)', () => {
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
    await db.delete(workflowStages).where(eq(workflowStages.spaceId, TEST_SPACE_ID));
    await db.delete(workflows).where(eq(workflows.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    // Seed test space
    await db.insert(spaces).values({
      id: TEST_SPACE_ID,
      uuid: `test-space-uuid-${TEST_SPACE_ID}`,
      name: 'Test Space Workflows MAPI',
      defaultLang: 'default',
    });

    // Seed management token
    const tokenId = TEST_SPACE_ID * 1000 + 1;
    await db.insert(apiTokens).values({
      id: tokenId,
      spaceId: TEST_SPACE_ID,
      name: 'Test Workflows Management Token',
      token: TEST_TOKEN,
      tokenType: 'management',
    });
  });

  afterAll(async () => {
    await db.delete(workflowStages).where(eq(workflowStages.spaceId, TEST_SPACE_ID));
    await db.delete(workflows).where(eq(workflows.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    await app.close();
  });

  // ─── Workflows ───────────────────────────────────────────────────────────────

  describe('GET /v1/spaces/:spaceId/workflows', () => {
    it('returns 401 without token', () => {
      return request(app.getHttpServer()).get(`/v1/spaces/${TEST_SPACE_ID}/workflows`).expect(401);
    });

    it('returns empty list of workflows', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/workflows?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('workflows');
      expect(Array.isArray(res.body.workflows)).toBe(true);
    });
  });

  describe('POST /v1/spaces/:spaceId/workflows', () => {
    it('creates a workflow', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/workflows?token=${TEST_TOKEN}`)
        .send({
          workflow: {
            name: 'Test Workflow',
            content_types: ['article'],
            is_default: false,
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty('workflow');
      expect(res.body.workflow).toHaveProperty('id');
      expect(res.body.workflow.name).toBe('Test Workflow');
      expect(res.body.workflow.content_types).toEqual(['article']);
      expect(res.body.workflow.is_default).toBe(false);
    });
  });

  describe('GET /v1/spaces/:spaceId/workflows/:id', () => {
    let workflowId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/workflows?token=${TEST_TOKEN}`)
        .send({ workflow: { name: 'Get Test Workflow' } });
      workflowId = res.body.workflow.id;
    });

    it('returns a single workflow', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/workflows/${workflowId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('workflow');
      expect(res.body.workflow.id).toBe(workflowId);
      expect(res.body.workflow.name).toBe('Get Test Workflow');
    });

    it('returns 404 for non-existent workflow', () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/workflows/999999999?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:spaceId/workflows/:id', () => {
    let workflowId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/workflows?token=${TEST_TOKEN}`)
        .send({ workflow: { name: 'Update Test Workflow' } });
      workflowId = res.body.workflow.id;
    });

    it('updates a workflow', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/workflows/${workflowId}?token=${TEST_TOKEN}`)
        .send({
          workflow: {
            name: 'Updated Workflow Name',
            content_types: ['page', 'article'],
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('workflow');
      expect(res.body.workflow.name).toBe('Updated Workflow Name');
      expect(res.body.workflow.content_types).toEqual(['page', 'article']);
    });

    it('returns 404 for non-existent workflow', () => {
      return request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/workflows/999999999?token=${TEST_TOKEN}`)
        .send({ workflow: { name: 'x' } })
        .expect(404);
    });
  });

  describe('DELETE /v1/spaces/:spaceId/workflows/:id', () => {
    let workflowId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/workflows?token=${TEST_TOKEN}`)
        .send({ workflow: { name: 'Delete Test Workflow' } });
      workflowId = res.body.workflow.id;
    });

    it('deletes a workflow and returns 200 with empty object', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${TEST_SPACE_ID}/workflows/${workflowId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 after deletion', () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/workflows/${workflowId}?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });

  // ─── Workflow Stages ─────────────────────────────────────────────────────────

  describe('Workflow Stages CRUD', () => {
    let workflowId: number;
    let stageId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/workflows?token=${TEST_TOKEN}`)
        .send({ workflow: { name: 'Stages Test Workflow' } });
      workflowId = res.body.workflow.id;
    });

    describe('GET /v1/spaces/:spaceId/workflow_stages', () => {
      it('returns 401 without token', () => {
        return request(app.getHttpServer())
          .get(`/v1/spaces/${TEST_SPACE_ID}/workflow_stages`)
          .expect(401);
      });

      it('returns list of stages', async () => {
        const res = await request(app.getHttpServer())
          .get(`/v1/spaces/${TEST_SPACE_ID}/workflow_stages?token=${TEST_TOKEN}`)
          .expect(200);

        expect(res.body).toHaveProperty('workflow_stages');
        expect(Array.isArray(res.body.workflow_stages)).toBe(true);
      });
    });

    describe('POST /v1/spaces/:spaceId/workflow_stages', () => {
      it('creates a workflow stage', async () => {
        const res = await request(app.getHttpServer())
          .post(`/v1/spaces/${TEST_SPACE_ID}/workflow_stages?token=${TEST_TOKEN}`)
          .send({
            workflow_stage: {
              name: 'In Review',
              workflow_id: workflowId,
              color: '#ff9900',
              allow_publish: false,
              allow_all_users: true,
            },
          })
          .expect(201);

        expect(res.body).toHaveProperty('workflow_stage');
        expect(res.body.workflow_stage).toHaveProperty('id');
        expect(res.body.workflow_stage.name).toBe('In Review');
        expect(res.body.workflow_stage.color).toBe('#ff9900');
        expect(res.body.workflow_stage.workflow_id).toBe(workflowId);

        stageId = res.body.workflow_stage.id;
      });
    });

    describe('GET /v1/spaces/:spaceId/workflow_stages/:id', () => {
      it('returns a single stage', async () => {
        const res = await request(app.getHttpServer())
          .get(`/v1/spaces/${TEST_SPACE_ID}/workflow_stages/${stageId}?token=${TEST_TOKEN}`)
          .expect(200);

        expect(res.body).toHaveProperty('workflow_stage');
        expect(res.body.workflow_stage.id).toBe(stageId);
        expect(res.body.workflow_stage.name).toBe('In Review');
      });

      it('returns 404 for non-existent stage', () => {
        return request(app.getHttpServer())
          .get(`/v1/spaces/${TEST_SPACE_ID}/workflow_stages/999999999?token=${TEST_TOKEN}`)
          .expect(404);
      });
    });

    describe('PUT /v1/spaces/:spaceId/workflow_stages/:id', () => {
      it('updates a stage', async () => {
        const res = await request(app.getHttpServer())
          .put(`/v1/spaces/${TEST_SPACE_ID}/workflow_stages/${stageId}?token=${TEST_TOKEN}`)
          .send({
            workflow_stage: {
              name: 'Approved',
              color: '#00cc44',
              allow_publish: true,
            },
          })
          .expect(200);

        expect(res.body).toHaveProperty('workflow_stage');
        expect(res.body.workflow_stage.name).toBe('Approved');
        expect(res.body.workflow_stage.color).toBe('#00cc44');
        expect(res.body.workflow_stage.allow_publish).toBe(true);
      });

      it('returns 404 for non-existent stage', () => {
        return request(app.getHttpServer())
          .put(`/v1/spaces/${TEST_SPACE_ID}/workflow_stages/999999999?token=${TEST_TOKEN}`)
          .send({ workflow_stage: { name: 'x' } })
          .expect(404);
      });
    });

    describe('DELETE /v1/spaces/:spaceId/workflow_stages/:id', () => {
      it('deletes a stage and returns 200 with empty object', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/v1/spaces/${TEST_SPACE_ID}/workflow_stages/${stageId}?token=${TEST_TOKEN}`)
          .expect(200);

        expect(res.body).toEqual({});
      });

      it('returns 404 after deletion', () => {
        return request(app.getHttpServer())
          .get(`/v1/spaces/${TEST_SPACE_ID}/workflow_stages/${stageId}?token=${TEST_TOKEN}`)
          .expect(404);
      });
    });
  });
});
