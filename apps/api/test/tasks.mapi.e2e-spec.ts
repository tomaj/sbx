import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DB } from './../src/db/db.module';
import { spaces, apiTokens, tasks } from './../src/db/schema';
import { eq } from 'drizzle-orm';

const SPACE_ID = 999010;
const TOKEN = 'test-tasks-mapi-token';

describe('Tasks MAPI (e2e)', () => {
  let app: INestApplication<App>;
  let db: any;
  let testTaskId: number;

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
        uuid: `test-tasks-mapi-space-uuid-${SPACE_ID}`,
        name: 'Test Tasks MAPI Space',
      })
      .onConflictDoNothing();

    const tokenId = SPACE_ID * 1000 + 1;
    await db
      .insert(apiTokens)
      .values({
        id: tokenId,
        spaceId: SPACE_ID,
        name: 'Test Tasks MAPI Token',
        token: TOKEN,
        tokenType: 'management',
      })
      .onConflictDoNothing();

    // Seed a task
    const [task] = await db
      .insert(tasks)
      .values({
        spaceId: SPACE_ID,
        name: 'Seed Task',
        description: 'Seed description',
        taskType: 'webhook',
        webhookUrl: 'https://example.com/webhook',
      })
      .returning();
    testTaskId = Number(task.id);
  });

  afterAll(async () => {
    await db.delete(tasks).where(eq(tasks.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));
    await app.close();
  });

  describe('GET /v1/spaces/:spaceId/tasks', () => {
    it('returns 200 with tasks array', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/tasks?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('tasks');
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.tasks.length).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/spaces/:spaceId/tasks/:id', () => {
    it('returns 200 with a single task', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/tasks/${testTaskId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('task');
      expect(res.body.task.id).toBe(testTaskId);
      expect(res.body.task.name).toBe('Seed Task');
    });

    it('returns 404 for nonexistent task', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/tasks/99999999?token=${TOKEN}`)
        .expect(404);
    });
  });

  describe('POST /v1/spaces/:spaceId/tasks', () => {
    it('returns 201 and creates a task', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/tasks?token=${TOKEN}`)
        .send({
          task: {
            name: 'New E2E Task',
            description: 'Created in e2e test',
            webhook_url: 'https://example.com/hook',
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty('task');
      expect(res.body.task.name).toBe('New E2E Task');
      expect(res.body.task.description).toBe('Created in e2e test');
      expect(res.body.task.id).toBeDefined();
    });
  });

  describe('PUT /v1/spaces/:spaceId/tasks/:id', () => {
    it('returns 200 and updates a task', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/tasks/${testTaskId}?token=${TOKEN}`)
        .send({ task: { name: 'Updated Task Name', description: 'Updated desc' } })
        .expect(200);

      expect(res.body).toHaveProperty('task');
      expect(res.body.task.name).toBe('Updated Task Name');
      expect(res.body.task.description).toBe('Updated desc');
    });

    it('returns 404 for nonexistent task', async () => {
      await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/tasks/99999999?token=${TOKEN}`)
        .send({ task: { name: 'ghost' } })
        .expect(404);
    });
  });

  describe('DELETE /v1/spaces/:spaceId/tasks/:id', () => {
    it('returns 200 and deletes the task', async () => {
      const [tmp] = await db
        .insert(tasks)
        .values({ spaceId: SPACE_ID, name: 'Task To Delete', taskType: 'webhook' })
        .returning();

      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${SPACE_ID}/tasks/${tmp.id}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 for nonexistent task', async () => {
      await request(app.getHttpServer())
        .delete(`/v1/spaces/${SPACE_ID}/tasks/99999999?token=${TOKEN}`)
        .expect(404);
    });
  });
});
