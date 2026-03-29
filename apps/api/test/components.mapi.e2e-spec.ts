import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import { eq } from 'drizzle-orm';
import { apiTokens, componentGroups, components, spaces } from '../src/db/schema';

const SPACE_ID = 999004;
const TOKEN = 'test-components-mapi-token';

describe('Components MAPI (e2e)', () => {
  let app: INestApplication<App>;
  let db: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = app.get(DB);

    // Seed: space
    await db
      .insert(spaces)
      .values({
        id: SPACE_ID,
        uuid: 'test-space-uuid-components-mapi',
        name: 'Test Components MAPI Space',
        defaultLang: 'default',
      })
      .onConflictDoNothing();

    // Seed: management token
    const tokenId = SPACE_ID * 1000 + 1;
    await db
      .insert(apiTokens)
      .values({
        id: tokenId,
        spaceId: SPACE_ID,
        name: 'test-mapi-token',
        token: TOKEN,
        tokenType: 'management',
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    // Cleanup: delete test data in correct order (children first)
    await db.delete(components).where(eq(components.spaceId, SPACE_ID));
    await db.delete(componentGroups).where(eq(componentGroups.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));
    await app.close();
  });

  // ─── Component Groups ────────────────────────────────────────────────────────

  describe('GET /v1/spaces/:id/component_groups', () => {
    it('returns empty list initially', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/component_groups?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('component_groups');
      expect(Array.isArray(res.body.component_groups)).toBe(true);
    });
  });

  describe('POST /v1/spaces/:id/component_groups', () => {
    it('creates a component group', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/component_groups?token=${TOKEN}`)
        .send({ component_group: { name: 'Test Group' } })
        .expect(201);

      expect(res.body).toHaveProperty('component_group');
      expect(res.body.component_group.name).toBe('Test Group');
      expect(res.body.component_group).toHaveProperty('id');
      expect(res.body.component_group).toHaveProperty('uuid');
    });
  });

  describe('GET /v1/spaces/:id/component_groups/:id', () => {
    let groupId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/component_groups?token=${TOKEN}`)
        .send({ component_group: { name: 'Group For Get' } })
        .expect(201);
      groupId = res.body.component_group.id;
    });

    it('returns the component group', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/component_groups/${groupId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('component_group');
      expect(res.body.component_group.id).toBe(groupId);
      expect(res.body.component_group.name).toBe('Group For Get');
    });

    it('returns 404 for non-existent group', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/component_groups/99999999?token=${TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:id/component_groups/:id', () => {
    let groupId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/component_groups?token=${TOKEN}`)
        .send({ component_group: { name: 'Group To Update' } })
        .expect(201);
      groupId = res.body.component_group.id;
    });

    it('updates the component group name', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/component_groups/${groupId}?token=${TOKEN}`)
        .send({ component_group: { name: 'Updated Group Name' } })
        .expect(200);

      expect(res.body).toHaveProperty('component_group');
      expect(res.body.component_group.id).toBe(groupId);
      expect(res.body.component_group.name).toBe('Updated Group Name');
    });
  });

  describe('DELETE /v1/spaces/:id/component_groups/:id', () => {
    let groupId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/component_groups?token=${TOKEN}`)
        .send({ component_group: { name: 'Group To Delete' } })
        .expect(201);
      groupId = res.body.component_group.id;
    });

    it('deletes the component group and returns 200 with {}', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${SPACE_ID}/component_groups/${groupId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/component_groups/${groupId}?token=${TOKEN}`)
        .expect(404);
    });
  });

  // ─── Components ──────────────────────────────────────────────────────────────

  describe('GET /v1/spaces/:id/components', () => {
    it('returns list of components', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/components?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('components');
      expect(Array.isArray(res.body.components)).toBe(true);
    });
  });

  describe('POST /v1/spaces/:id/components', () => {
    it('creates a component', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/components?token=${TOKEN}`)
        .send({
          component: {
            name: 'test_component',
            display_name: 'Test Component',
            schema: { title: { type: 'text' } },
            is_root: true,
            is_nestable: false,
          },
        })
        .expect(201);

      expect(res.body).toHaveProperty('component');
      expect(res.body.component.name).toBe('test_component');
      expect(res.body.component.display_name).toBe('Test Component');
      expect(res.body.component.is_root).toBe(true);
      expect(res.body.component.is_nestable).toBe(false);
      expect(res.body.component).toHaveProperty('id');
    });
  });

  describe('GET /v1/spaces/:id/components/:id', () => {
    let componentId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/components?token=${TOKEN}`)
        .send({ component: { name: 'component_for_get' } })
        .expect(201);
      componentId = res.body.component.id;
    });

    it('returns the component', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/components/${componentId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('component');
      expect(res.body.component.id).toBe(componentId);
      expect(res.body.component.name).toBe('component_for_get');
    });

    it('returns 404 for non-existent component', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/components/99999999?token=${TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:id/components/:id', () => {
    let componentId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/components?token=${TOKEN}`)
        .send({ component: { name: 'component_to_update' } })
        .expect(201);
      componentId = res.body.component.id;
    });

    it('updates the component', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${SPACE_ID}/components/${componentId}?token=${TOKEN}`)
        .send({
          component: {
            display_name: 'Updated Display Name',
            description: 'Updated description',
            is_root: true,
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('component');
      expect(res.body.component.id).toBe(componentId);
      expect(res.body.component.display_name).toBe('Updated Display Name');
      expect(res.body.component.description).toBe('Updated description');
      expect(res.body.component.is_root).toBe(true);
    });
  });

  describe('DELETE /v1/spaces/:id/components/:id', () => {
    let componentId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${SPACE_ID}/components?token=${TOKEN}`)
        .send({ component: { name: 'component_to_delete' } })
        .expect(201);
      componentId = res.body.component.id;
    });

    it('deletes the component and returns 200 with {}', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${SPACE_ID}/components/${componentId}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/v1/spaces/${SPACE_ID}/components/${componentId}?token=${TOKEN}`)
        .expect(404);
    });
  });
});
