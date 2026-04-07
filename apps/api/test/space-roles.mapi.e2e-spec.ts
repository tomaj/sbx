import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';

const TEST_SPACE_ID = 999005;
const TEST_TOKEN = 'test-spaceroles-mapi-token';

describe('Space Roles MAPI (e2e)', () => {
  let app: INestApplication<App>;
  let db: DbType;
  let createdRoleId: number;

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
        uuid: 'test-space-roles-uuid',
        name: 'Test Space Roles',
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
  });

  afterAll(async () => {
    // Cleanup test space (cascades to api_tokens and space_roles)
    await db.delete(schema.spaceRoles).where(eq(schema.spaceRoles.spaceId, TEST_SPACE_ID));
    await db.delete(schema.apiTokens).where(eq(schema.apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(schema.spaces).where(eq(schema.spaces.id, TEST_SPACE_ID));
    await app.close();
  });

  describe('GET /v1/spaces/:id/space_roles', () => {
    it('returns empty list when no roles exist', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/space_roles`)
        .query({ token: TEST_TOKEN })
        .expect(200);

      expect(res.body).toHaveProperty('space_roles');
      expect(Array.isArray(res.body.space_roles)).toBe(true);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get(`/v1/spaces/${TEST_SPACE_ID}/space_roles`).expect(401);
    });
  });

  describe('POST /v1/spaces/:id/space_roles', () => {
    it('creates a new space role and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/space_roles`)
        .query({ token: TEST_TOKEN })
        .send({
          space_role: {
            role: 'Content Editor',
            subtitle: 'Can edit content only',
            permissions: ['edit_story'],
            allowed_paths: ['/home'],
            blocked_paths: ['/admin'],
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty('space_role');
      expect(res.body.space_role.role).toBe('Content Editor');
      expect(res.body.space_role.subtitle).toBe('Can edit content only');
      expect(res.body.space_role.permissions).toEqual(['edit_story']);
      expect(res.body.space_role.allowed_paths).toEqual(['/home']);
      expect(res.body.space_role.blocked_paths).toEqual(['/admin']);
      expect(res.body.space_role.id).toBeDefined();

      createdRoleId = res.body.space_role.id;
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/space_roles`)
        .send({ space_role: { role: 'Test' } })
        .expect(401);
    });
  });

  describe('GET /v1/spaces/:id/space_roles/:roleId', () => {
    it('returns the created space role', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/space_roles/${createdRoleId}`)
        .query({ token: TEST_TOKEN })
        .expect(200);

      expect(res.body).toHaveProperty('space_role');
      expect(res.body.space_role.id).toBe(createdRoleId);
      expect(res.body.space_role.role).toBe('Content Editor');
    });

    it('returns 404 for non-existent role', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/space_roles/999999999`)
        .query({ token: TEST_TOKEN })
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:id/space_roles/:roleId', () => {
    it('updates an existing space role', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/space_roles/${createdRoleId}`)
        .query({ token: TEST_TOKEN })
        .send({
          space_role: {
            role: 'Senior Editor',
            subtitle: 'Updated subtitle',
            permissions: ['edit_story', 'publish_story'],
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('space_role');
      expect(res.body.space_role.role).toBe('Senior Editor');
      expect(res.body.space_role.subtitle).toBe('Updated subtitle');
      expect(res.body.space_role.permissions).toEqual(['edit_story', 'publish_story']);
    });

    it('returns 404 for non-existent role', async () => {
      await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/space_roles/999999999`)
        .query({ token: TEST_TOKEN })
        .send({ space_role: { role: 'X' } })
        .expect(404);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/space_roles/${createdRoleId}`)
        .send({ space_role: { role: 'X' } })
        .expect(401);
    });
  });

  describe('GET /v1/spaces/:id/space_roles (list after create)', () => {
    it('includes the newly created role in the list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/space_roles`)
        .query({ token: TEST_TOKEN })
        .expect(200);

      const found = res.body.space_roles.find((r: any) => r.id === createdRoleId);
      expect(found).toBeDefined();
      expect(found.role).toBe('Senior Editor');
    });
  });

  describe('DELETE /v1/spaces/:id/space_roles/:roleId', () => {
    it('deletes an existing space role and returns {}', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${TEST_SPACE_ID}/space_roles/${createdRoleId}`)
        .query({ token: TEST_TOKEN })
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/space_roles/${createdRoleId}`)
        .query({ token: TEST_TOKEN })
        .expect(404);
    });

    it('returns 404 for non-existent role on delete', async () => {
      await request(app.getHttpServer())
        .delete(`/v1/spaces/${TEST_SPACE_ID}/space_roles/999999999`)
        .query({ token: TEST_TOKEN })
        .expect(404);
    });
  });
});
