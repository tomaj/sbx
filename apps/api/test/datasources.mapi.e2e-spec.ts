import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, datasources, datasourceEntries } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TEST_SPACE_ID = 999003;
const TEST_TOKEN = 'test-datasources-mapi-token';

describe('Datasources MAPI (e2e)', () => {
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
    await db
      .delete(datasourceEntries)
      .where(
        eq(
          datasourceEntries.datasourceId,
          // delete all entries belonging to datasources of this space via subquery workaround:
          // we'll do it in afterAll instead — just wipe the space cascade
          0n as any,
        ),
      )
      .catch(() => {});
    await db.delete(datasources).where(eq(datasources.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    // Seed test space
    await db.insert(spaces).values({
      id: TEST_SPACE_ID,
      uuid: 'test-space-uuid-999003',
      name: 'Test Space Datasources MAPI',
      defaultLang: 'default',
    });

    // Seed management token
    const tokenId = TEST_SPACE_ID * 1000 + 1;
    await db.insert(apiTokens).values({
      id: tokenId,
      spaceId: TEST_SPACE_ID,
      name: 'Test Management Token Datasources',
      token: TEST_TOKEN,
      tokenType: 'management',
    });
  });

  afterAll(async () => {
    // Cascade delete cleans datasources + entries when space is deleted
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(datasources).where(eq(datasources.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));
    await app.close();
  });

  // ─── Datasources ──────────────────────────────────────────────────────────

  describe('GET /v1/spaces/:spaceId/datasources', () => {
    it('returns 401 without token', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/datasources`)
        .expect(401);
    });

    it('returns empty datasources list initially', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/datasources?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('datasources');
      expect(Array.isArray(res.body.datasources)).toBe(true);
    });
  });

  describe('POST /v1/spaces/:spaceId/datasources', () => {
    it('creates a datasource', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/datasources?token=${TEST_TOKEN}`)
        .send({ datasource: { name: 'Countries', slug: 'countries' } })
        .expect(201);

      expect(res.body).toHaveProperty('datasource');
      expect(res.body.datasource).toHaveProperty('id');
      expect(res.body.datasource.name).toBe('Countries');
      expect(res.body.datasource.slug).toBe('countries');
    });

    it('creates a second datasource', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/datasources?token=${TEST_TOKEN}`)
        .send({ datasource: { name: 'Languages', slug: 'languages' } })
        .expect(201);

      expect(res.body.datasource.slug).toBe('languages');
    });
  });

  describe('GET /v1/spaces/:spaceId/datasources (after create)', () => {
    it('returns all created datasources', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/datasources?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body.datasources.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /v1/spaces/:spaceId/datasources/:id', () => {
    let datasourceId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/datasources?token=${TEST_TOKEN}`)
        .send({ datasource: { name: 'Get Test DS', slug: 'get-test-ds' } });
      datasourceId = res.body.datasource.id;
    });

    it('returns a single datasource by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/datasources/${datasourceId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('datasource');
      expect(res.body.datasource.id).toBe(datasourceId);
      expect(res.body.datasource.name).toBe('Get Test DS');
      expect(res.body.datasource).toHaveProperty('dimensions');
    });

    it('returns 404 for non-existent datasource', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/datasources/999999999?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });

  describe('PUT /v1/spaces/:spaceId/datasources/:id', () => {
    let datasourceId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/datasources?token=${TEST_TOKEN}`)
        .send({ datasource: { name: 'Update Test DS', slug: 'update-test-ds' } });
      datasourceId = res.body.datasource.id;
    });

    it('updates a datasource name', async () => {
      const res = await request(app.getHttpServer())
        .put(`/v1/spaces/${TEST_SPACE_ID}/datasources/${datasourceId}?token=${TEST_TOKEN}`)
        .send({ datasource: { name: 'Updated DS Name' } })
        .expect(200);

      expect(res.body).toHaveProperty('datasource');
      expect(res.body.datasource.name).toBe('Updated DS Name');
    });
  });

  describe('DELETE /v1/spaces/:spaceId/datasources/:id', () => {
    let datasourceId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/datasources?token=${TEST_TOKEN}`)
        .send({ datasource: { name: 'Delete Test DS', slug: 'delete-test-ds' } });
      datasourceId = res.body.datasource.id;
    });

    it('deletes a datasource and returns 200 with empty object', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/v1/spaces/${TEST_SPACE_ID}/datasources/${datasourceId}?token=${TEST_TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 404 after deletion', async () => {
      return request(app.getHttpServer())
        .get(`/v1/spaces/${TEST_SPACE_ID}/datasources/${datasourceId}?token=${TEST_TOKEN}`)
        .expect(404);
    });
  });

  // ─── Datasource Entries ───────────────────────────────────────────────────

  describe('Datasource Entries', () => {
    let datasourceId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/datasources?token=${TEST_TOKEN}`)
        .send({ datasource: { name: 'Entries Test DS', slug: 'entries-test-ds' } });
      datasourceId = res.body.datasource.id;
    });

    describe('GET /v1/spaces/:spaceId/datasource_entries', () => {
      it('returns 401 without token', async () => {
        return request(app.getHttpServer())
          .get(`/v1/spaces/${TEST_SPACE_ID}/datasource_entries?datasource_id=${datasourceId}`)
          .expect(401);
      });

      it('returns empty entries list initially', async () => {
        const res = await request(app.getHttpServer())
          .get(
            `/v1/spaces/${TEST_SPACE_ID}/datasource_entries?token=${TEST_TOKEN}&datasource_id=${datasourceId}`,
          )
          .expect(200);

        expect(res.body).toHaveProperty('datasource_entries');
        expect(Array.isArray(res.body.datasource_entries)).toBe(true);
        expect(res.body.datasource_entries.length).toBe(0);
      });
    });

    describe('POST /v1/spaces/:spaceId/datasource_entries', () => {
      it('creates a datasource entry', async () => {
        const res = await request(app.getHttpServer())
          .post(`/v1/spaces/${TEST_SPACE_ID}/datasource_entries?token=${TEST_TOKEN}`)
          .send({
            datasource_entry: {
              name: 'Slovakia',
              value: 'sk',
              datasource_id: datasourceId,
            },
          })
          .expect(201);

        expect(res.body).toHaveProperty('datasource_entry');
        expect(res.body.datasource_entry).toHaveProperty('id');
        expect(res.body.datasource_entry.name).toBe('Slovakia');
        expect(res.body.datasource_entry.value).toBe('sk');
        expect(res.body.datasource_entry.datasource_id).toBe(datasourceId);
      });

      it('creates a second datasource entry', async () => {
        const res = await request(app.getHttpServer())
          .post(`/v1/spaces/${TEST_SPACE_ID}/datasource_entries?token=${TEST_TOKEN}`)
          .send({
            datasource_entry: {
              name: 'Czech Republic',
              value: 'cz',
              datasource_id: datasourceId,
            },
          })
          .expect(201);

        expect(res.body.datasource_entry.value).toBe('cz');
      });
    });

    describe('GET /v1/spaces/:spaceId/datasource_entries (after create)', () => {
      it('lists entries filtered by datasource_id', async () => {
        const res = await request(app.getHttpServer())
          .get(
            `/v1/spaces/${TEST_SPACE_ID}/datasource_entries?token=${TEST_TOKEN}&datasource_id=${datasourceId}`,
          )
          .expect(200);

        expect(res.body.datasource_entries.length).toBeGreaterThanOrEqual(2);
        expect(
          res.body.datasource_entries.every((e: any) => e.datasource_id === datasourceId),
        ).toBe(true);
      });

      it('lists entries without datasource_id filter', async () => {
        const res = await request(app.getHttpServer())
          .get(`/v1/spaces/${TEST_SPACE_ID}/datasource_entries?token=${TEST_TOKEN}`)
          .expect(200);

        expect(Array.isArray(res.body.datasource_entries)).toBe(true);
        expect(res.body.datasource_entries.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('GET /v1/spaces/:spaceId/datasource_entries/:id', () => {
      let entryId: number;

      beforeAll(async () => {
        const res = await request(app.getHttpServer())
          .post(`/v1/spaces/${TEST_SPACE_ID}/datasource_entries?token=${TEST_TOKEN}`)
          .send({
            datasource_entry: {
              name: 'Get Test Entry',
              value: 'get-val',
              datasource_id: datasourceId,
            },
          });
        entryId = res.body.datasource_entry.id;
      });

      it('returns a single entry by id with datasource_id param', async () => {
        const res = await request(app.getHttpServer())
          .get(
            `/v1/spaces/${TEST_SPACE_ID}/datasource_entries/${entryId}?token=${TEST_TOKEN}&datasource_id=${datasourceId}`,
          )
          .expect(200);

        expect(res.body).toHaveProperty('datasource_entry');
        expect(res.body.datasource_entry.id).toBe(entryId);
        expect(res.body.datasource_entry.name).toBe('Get Test Entry');
      });

      it('returns a single entry by id without datasource_id param', async () => {
        const res = await request(app.getHttpServer())
          .get(`/v1/spaces/${TEST_SPACE_ID}/datasource_entries/${entryId}?token=${TEST_TOKEN}`)
          .expect(200);

        expect(res.body).toHaveProperty('datasource_entry');
        expect(res.body.datasource_entry.id).toBe(entryId);
      });

      it('returns 404 for non-existent entry', async () => {
        return request(app.getHttpServer())
          .get(
            `/v1/spaces/${TEST_SPACE_ID}/datasource_entries/999999999?token=${TEST_TOKEN}&datasource_id=${datasourceId}`,
          )
          .expect(404);
      });
    });

    describe('PUT /v1/spaces/:spaceId/datasource_entries/:id', () => {
      let entryId: number;

      beforeAll(async () => {
        const res = await request(app.getHttpServer())
          .post(`/v1/spaces/${TEST_SPACE_ID}/datasource_entries?token=${TEST_TOKEN}`)
          .send({
            datasource_entry: {
              name: 'Update Test Entry',
              value: 'upd-val',
              datasource_id: datasourceId,
            },
          });
        entryId = res.body.datasource_entry.id;
      });

      it('updates a datasource entry', async () => {
        const res = await request(app.getHttpServer())
          .put(`/v1/spaces/${TEST_SPACE_ID}/datasource_entries/${entryId}?token=${TEST_TOKEN}`)
          .send({
            datasource_entry: {
              name: 'Updated Entry Name',
              datasource_id: datasourceId,
            },
          })
          .expect(200);

        expect(res.body).toHaveProperty('datasource_entry');
        expect(res.body.datasource_entry.name).toBe('Updated Entry Name');
      });
    });

    describe('DELETE /v1/spaces/:spaceId/datasource_entries/:id', () => {
      let entryId: number;

      beforeAll(async () => {
        const res = await request(app.getHttpServer())
          .post(`/v1/spaces/${TEST_SPACE_ID}/datasource_entries?token=${TEST_TOKEN}`)
          .send({
            datasource_entry: {
              name: 'Delete Test Entry',
              value: 'del-val',
              datasource_id: datasourceId,
            },
          });
        entryId = res.body.datasource_entry.id;
      });

      it('deletes an entry and returns 200 with empty object', async () => {
        const res = await request(app.getHttpServer())
          .delete(
            `/v1/spaces/${TEST_SPACE_ID}/datasource_entries/${entryId}?token=${TEST_TOKEN}&datasource_id=${datasourceId}`,
          )
          .expect(200);

        expect(res.body).toEqual({});
      });

      it('returns 404 after deletion', async () => {
        return request(app.getHttpServer())
          .get(
            `/v1/spaces/${TEST_SPACE_ID}/datasource_entries/${entryId}?token=${TEST_TOKEN}&datasource_id=${datasourceId}`,
          )
          .expect(404);
      });
    });
  });
});
