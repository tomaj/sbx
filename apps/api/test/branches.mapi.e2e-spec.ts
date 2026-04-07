import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DB } from './../src/db/db.module';
import { spaces, apiTokens, branches } from './../src/db/schema';
import { eq } from 'drizzle-orm';

const SPACE_ID = 999008;
const TOKEN = 'test-branches-mapi-token';

describe('Branches MAPI (e2e)', () => {
  let app: INestApplication<App>;
  let db: any;
  let testBranchId: number;

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
        uuid: `test-branches-mapi-space-uuid-${SPACE_ID}`,
        name: 'Test Branches MAPI Space',
      })
      .onConflictDoNothing();

    const tokenId = SPACE_ID * 1000 + 1;
    await db
      .insert(apiTokens)
      .values({
        id: tokenId,
        spaceId: SPACE_ID,
        name: 'Test Branches MAPI Token',
        token: TOKEN,
        tokenType: 'management',
      })
      .onConflictDoNothing();

    // Seed a branch (provide explicit id since branches.id has no identity in DB)
    const seedBranchId = SPACE_ID * 100 + 1;
    await db.delete(branches).where(eq(branches.spaceId, SPACE_ID));
    const [branch] = await db
      .insert(branches)
      .values({
        id: seedBranchId,
        spaceId: SPACE_ID,
        name: 'seed-branch',
        url: 'https://seed.example.com',
      })
      .returning();
    testBranchId = branch.id;
  });

  afterAll(async () => {
    await db.delete(branches).where(eq(branches.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));
    await app.close();
  });

  describe('GET /v1/spaces/:spaceId/branches', () => {
    it('returns 200 with branches array', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/branches?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('branches');
      expect(Array.isArray(res.body.branches)).toBe(true);
      expect(res.body.branches.length).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/spaces/:spaceId/branches/:id', () => {
    it('returns 200 with a single branch', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/branches/${testBranchId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('branch');
      expect(res.body.branch.id).toBe(testBranchId);
    });

    it('returns 404 for nonexistent branch', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/branches/99999999?token=${TOKEN}`)
        .expect(404);
    });
  });

  describe('POST /v1/spaces/:spaceId/branches', () => {
    it('returns 201 and creates a branch', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/branches?token=${TOKEN}`)
        .send({ branch: { name: 'new-e2e-branch', url: 'https://new.example.com' } })
        .expect(201);

      expect(res.body).toHaveProperty('branch');
      expect(res.body.branch.name).toBe('new-e2e-branch');
      expect(res.body.branch.url).toBe('https://new.example.com');
      expect(res.body.branch.id).toBeDefined();
    });
  });

  describe('PUT /v1/spaces/:spaceId/branches/:id', () => {
    it('returns 200 and updates a branch', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/branches/${testBranchId}?token=${TOKEN}`)
        .send({ branch: { name: 'updated-branch', url: 'https://updated.example.com' } })
        .expect(200);

      expect(res.body).toHaveProperty('branch');
      expect(res.body.branch.name).toBe('updated-branch');
      expect(res.body.branch.url).toBe('https://updated.example.com');
    });

    it('returns 404 for nonexistent branch', async () => {
      await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/branches/99999999?token=${TOKEN}`)
        .send({ branch: { name: 'ghost' } })
        .expect(404);
    });
  });

  describe('DELETE /v1/spaces/:spaceId/branches/:id', () => {
    it('returns 200 and deletes the branch', async () => {
      const tmpBranchId = SPACE_ID * 100 + 2;
      await db.delete(branches).where(eq(branches.id, tmpBranchId));
      const [tmp] = await db
        .insert(branches)
        .values({ id: tmpBranchId, spaceId: SPACE_ID, name: 'branch-to-delete' })
        .returning();

      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${SPACE_ID}/branches/${tmp.id}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 for nonexistent branch', async () => {
      await request(app.getHttpServer())
        .delete(`/v1/spaces/${SPACE_ID}/branches/99999999?token=${TOKEN}`)
        .expect(404);
    });
  });
});
