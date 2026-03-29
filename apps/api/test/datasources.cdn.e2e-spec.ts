import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, datasources, datasourceEntries } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const SPACE_ID = 999023;
const TOKEN = 'test-datasources-cdn-token';

describe('Datasources CDN (e2e)', () => {
  let app: INestApplication;
  let db: DbType;

  let dsId: bigint;
  let dsSlug: string;
  let entryId: bigint;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DbType>(DB);

    await db.delete(datasources).where(eq(datasources.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));

    await db.insert(spaces).values({
      id: SPACE_ID,
      uuid: `test-cdn-ds-space-${SPACE_ID}`,
      name: 'Test CDN Datasources Space',
      version: 1700000002,
    });

    await db.insert(apiTokens).values({
      id: SPACE_ID * 1000 + 1,
      spaceId: SPACE_ID,
      name: 'Public',
      token: TOKEN,
      tokenType: 'public',
    });

    const baseId = BigInt(SPACE_ID) * 100000n;
    dsId = baseId + 1n;
    dsSlug = 'colors';

    await db.insert(datasources).values({
      id: dsId,
      uuid: crypto.randomUUID(),
      spaceId: SPACE_ID,
      name: 'Colors',
      slug: dsSlug,
    });

    // Insert a second datasource
    await db.insert(datasources).values({
      id: baseId + 2n,
      uuid: crypto.randomUUID(),
      spaceId: SPACE_ID,
      name: 'Sizes',
      slug: 'sizes',
    });

    // Insert entries for colors datasource
    entryId = baseId + 10n;
    await db.insert(datasourceEntries).values([
      {
        id: entryId,
        datasourceId: dsId,
        name: 'Red',
        value: 'red',
        dimensionValue: { sk: 'cervena' },
        position: 1,
      },
      {
        id: baseId + 11n,
        datasourceId: dsId,
        name: 'Blue',
        value: 'blue',
        dimensionValue: { sk: 'modra' },
        position: 2,
      },
      {
        id: baseId + 12n,
        datasourceId: dsId,
        name: 'Green',
        value: 'green',
        dimensionValue: {},
        position: 3,
      },
    ]);
  });

  afterAll(async () => {
    // Cascade via FK: deleting space deletes datasources + entries
    await db.delete(datasources).where(eq(datasources.spaceId, SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, SPACE_ID));
    await app.close();
  });

  describe('auth', () => {
    it('returns 401 without token on datasources', () => {
      return request(app.getHttpServer()).get('/v2/cdn/datasources').expect(401);
    });

    it('returns 401 without token on datasource_entries', () => {
      return request(app.getHttpServer()).get('/v2/cdn/datasource_entries').expect(401);
    });
  });

  describe('GET /v2/cdn/datasources', () => {
    it('returns datasources list with cv', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/datasources?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('datasources');
      expect(res.body).toHaveProperty('cv', 1700000002);
      expect(Array.isArray(res.body.datasources)).toBe(true);
      expect(res.body.datasources.length).toBe(2);
    });

    it('datasource object has expected fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/datasources?token=${TOKEN}`)
        .expect(200);

      const ds = res.body.datasources.find((d: any) => d.slug === dsSlug);
      expect(ds).toBeDefined();
      expect(ds).toHaveProperty('id');
      expect(ds).toHaveProperty('name', 'Colors');
      expect(ds).toHaveProperty('slug', dsSlug);
      expect(ds).toHaveProperty('dimensions');
      expect(ds).not.toHaveProperty('created_at');
      expect(ds).not.toHaveProperty('updated_at');
    });
  });

  describe('GET /v2/cdn/datasources/:id', () => {
    it('returns single datasource with cv', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/datasources/${Number(dsId)}?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('datasource');
      expect(res.body).toHaveProperty('cv', 1700000002);
      expect(res.body.datasource.id).toBe(Number(dsId));
      expect(res.body.datasource.name).toBe('Colors');
      expect(res.body.datasource.slug).toBe(dsSlug);
    });

    it('returns 404 for non-existent datasource', async () => {
      return request(app.getHttpServer())
        .get(`/v2/cdn/datasources/999999999?token=${TOKEN}`)
        .expect(404);
    });
  });

  describe('GET /v2/cdn/datasource_entries', () => {
    it('returns all entries for space with cv', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/datasource_entries?token=${TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('datasource_entries');
      expect(res.body).toHaveProperty('cv', 1700000002);
      expect(Array.isArray(res.body.datasource_entries)).toBe(true);
      expect(res.body.datasource_entries.length).toBe(3);
    });

    it('entry object has expected fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/datasource_entries?token=${TOKEN}&datasource=${dsSlug}`)
        .expect(200);

      const entry = res.body.datasource_entries[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('value');
      expect(entry).toHaveProperty('dimension_value');
      expect(entry).not.toHaveProperty('created_at');
      expect(entry).not.toHaveProperty('updated_at');
    });

    it('filters by datasource slug', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/datasource_entries?token=${TOKEN}&datasource=${dsSlug}`)
        .expect(200);

      expect(res.body.datasource_entries.length).toBe(3);
    });

    it('returns dimension_value when dimension param is given', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/datasource_entries?token=${TOKEN}&datasource=${dsSlug}&dimension=sk`)
        .expect(200);

      const red = res.body.datasource_entries.find((e: any) => e.value === 'red');
      expect(red).toBeDefined();
      expect(red.dimension_value).toBe('cervena');
    });

    it('returns null dimension_value when dimension key not found', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/datasource_entries?token=${TOKEN}&datasource=${dsSlug}&dimension=sk`)
        .expect(200);

      const green = res.body.datasource_entries.find((e: any) => e.value === 'green');
      expect(green).toBeDefined();
      expect(green.dimension_value).toBeNull();
    });

    it('returns null dimension_value when no dimension param', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/datasource_entries?token=${TOKEN}&datasource=${dsSlug}`)
        .expect(200);

      expect(res.body.datasource_entries.every((e: any) => e.dimension_value === null)).toBe(true);
    });

    it('paginates with per_page and page', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/datasource_entries?token=${TOKEN}&datasource=${dsSlug}&per_page=2&page=1`)
        .expect(200);

      expect(res.body.datasource_entries.length).toBe(2);
    });

    it('returns second page', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/cdn/datasource_entries?token=${TOKEN}&datasource=${dsSlug}&per_page=2&page=2`)
        .expect(200);

      expect(res.body.datasource_entries.length).toBe(1);
    });
  });
});
