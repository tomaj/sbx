import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { randomBytes } from 'crypto';

const TEST_SPACE_ID = 999014;
const TEST_TOKEN = 'test-collaborators-mapi-token';

describe('Collaborators MAPI (e2e)', () => {
  let app: INestApplication<App>;
  let db: DbType;
  let testUserId: number;
  let testUser2Id: number;
  let createdMemberId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get<DbType>(DB);

    // Seed: ensure test space exists
    await db
      .insert(schema.spaces)
      .values({
        id: TEST_SPACE_ID,
        uuid: `test-space-collaborators-uuid-${TEST_SPACE_ID}`,
        name: 'Test Space Collaborators',
      })
      .onConflictDoNothing();

    // Seed: ensure management token exists
    const tokenId = TEST_SPACE_ID * 1000 + 1;
    await db
      .insert(schema.apiTokens)
      .values({
        id: tokenId,
        spaceId: TEST_SPACE_ID,
        name: 'test-mapi-token',
        token: TEST_TOKEN,
        tokenType: 'management',
      })
      .onConflictDoNothing();

    // Seed: create test users
    const user1 = await db
      .insert(schema.users)
      .values({
        uuid: randomBytes(16).toString('hex'),
        email: `collab-test-user1-${Date.now()}@test.example`,
        firstname: 'Collab',
        lastname: 'User1',
      })
      .returning({ id: schema.users.id });
    testUserId = user1[0].id;

    const user2 = await db
      .insert(schema.users)
      .values({
        uuid: randomBytes(16).toString('hex'),
        email: `collab-test-user2-${Date.now()}@test.example`,
        firstname: 'Collab',
        lastname: 'User2',
      })
      .returning({ id: schema.users.id });
    testUser2Id = user2[0].id;
  });

  afterAll(async () => {
    // Cleanup: remove space members first, then users, then space
    await db
      .delete(schema.spaceMembers)
      .where(eq(schema.spaceMembers.spaceId, TEST_SPACE_ID));
    if (testUserId) {
      await db.delete(schema.users).where(eq(schema.users.id, testUserId));
    }
    if (testUser2Id) {
      await db.delete(schema.users).where(eq(schema.users.id, testUser2Id));
    }
    await db.delete(schema.apiTokens).where(eq(schema.apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(schema.spaces).where(eq(schema.spaces.id, TEST_SPACE_ID));
    await app.close();
  });

  describe('GET /v1/spaces/:id/collaborators', () => {
    it('returns empty list initially', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/collaborators`)
        .query({ token: TEST_TOKEN })
        .expect(200);

      expect(res.body).toHaveProperty('collaborators');
      expect(Array.isArray(res.body.collaborators)).toBe(true);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/collaborators`)
        .expect(401);
    });
  });

  describe('POST /v1/spaces/:id/collaborators', () => {
    it('adds a collaborator by user_id and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/collaborators`)
        .query({ token: TEST_TOKEN })
        .send({
          collaborator: {
            user_id: testUserId,
            role: 'editor',
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty('collaborator');
      expect(res.body.collaborator.user_id).toBe(testUserId);
      expect(res.body.collaborator.role).toBe('editor');
      expect(res.body.collaborator.space_id).toBe(TEST_SPACE_ID);
      expect(res.body.collaborator.id).toBeDefined();
      expect(res.body.collaborator.user).toBeDefined();
      expect(res.body.collaborator.user.id).toBe(testUserId);

      createdMemberId = res.body.collaborator.id;
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/collaborators`)
        .send({ collaborator: { user_id: testUser2Id, role: 'editor' } })
        .expect(401);
    });

    it('returns 409 when user is already a member', async () => {
      await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/collaborators`)
        .query({ token: TEST_TOKEN })
        .send({
          collaborator: {
            user_id: testUserId,
            role: 'admin',
          },
        })
        .expect(409);
    });
  });

  describe('GET /v1/spaces/:id/collaborators/:id', () => {
    it('returns the collaborator by member id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/collaborators/${createdMemberId}`)
        .query({ token: TEST_TOKEN })
        .expect(200);

      expect(res.body).toHaveProperty('collaborator');
      expect(res.body.collaborator.id).toBe(createdMemberId);
      expect(res.body.collaborator.user_id).toBe(testUserId);
      expect(res.body.collaborator.role).toBe('editor');
    });

    it('returns 404 for non-existent member', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/collaborators/999999999`)
        .query({ token: TEST_TOKEN })
        .expect(404);
    });
  });

  describe('GET /v1/spaces/:id/collaborators (list after add)', () => {
    it('includes the newly added collaborator in the list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/collaborators`)
        .query({ token: TEST_TOKEN })
        .expect(200);

      const found = res.body.collaborators.find((c: any) => c.id === createdMemberId);
      expect(found).toBeDefined();
      expect(found.user_id).toBe(testUserId);
    });
  });

  describe('PUT /v1/spaces/:id/collaborators/:id', () => {
    it('updates collaborator role', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/collaborators/${createdMemberId}`)
        .query({ token: TEST_TOKEN })
        .send({
          collaborator: {
            role: 'admin',
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('collaborator');
      expect(res.body.collaborator.id).toBe(createdMemberId);
      expect(res.body.collaborator.role).toBe('admin');
    });

    it('returns 404 for non-existent member', async () => {
      await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/collaborators/999999999`)
        .query({ token: TEST_TOKEN })
        .send({ collaborator: { role: 'editor' } })
        .expect(404);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/collaborators/${createdMemberId}`)
        .send({ collaborator: { role: 'editor' } })
        .expect(401);
    });
  });

  describe('DELETE /v1/spaces/:id/collaborators/:id', () => {
    it('removes a collaborator and returns {}', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${TEST_SPACE_ID}/collaborators/${createdMemberId}`)
        .query({ token: TEST_TOKEN })
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/collaborators/${createdMemberId}`)
        .query({ token: TEST_TOKEN })
        .expect(404);
    });

    it('returns 404 for non-existent member on delete', async () => {
      await request(app.getHttpServer())
        .delete(`/v1/spaces/${TEST_SPACE_ID}/collaborators/999999999`)
        .query({ token: TEST_TOKEN })
        .expect(404);
    });
  });
});
