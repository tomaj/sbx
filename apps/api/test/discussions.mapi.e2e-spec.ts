import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DB } from '../src/db/db.module';
import type { DbType } from '../src/db/db.module';
import { spaces, apiTokens, discussions, comments } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const TEST_SPACE_ID = 999018;
const TEST_TOKEN = 'test-discussions-mapi-token';

describe('Discussions MAPI (e2e)', () => {
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
    await db.delete(comments).where(eq(comments.spaceId, TEST_SPACE_ID));
    await db.delete(discussions).where(eq(discussions.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    // Seed test space
    await db.insert(spaces).values({
      id: TEST_SPACE_ID,
      uuid: 'test-space-uuid-999018',
      name: 'Test Space Discussions MAPI',
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
    await db.delete(comments).where(eq(comments.spaceId, TEST_SPACE_ID));
    await db.delete(discussions).where(eq(discussions.spaceId, TEST_SPACE_ID));
    await db.delete(apiTokens).where(eq(apiTokens.spaceId, TEST_SPACE_ID));
    await db.delete(spaces).where(eq(spaces.id, TEST_SPACE_ID));

    await app.close();
  });

  describe('POST /v1/spaces/:spaceId/discussions', () => {
    it('returns 401 without token', async () => {
      return request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/discussions`)
        .send({ discussion: {} })
        .expect(401);
    });

    it('creates a discussion', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/discussions?token=${TEST_TOKEN}`)
        .send({ discussion: { story_id: 6001 } })
        .expect(201);

      expect(res.body).toHaveProperty('discussion');
      expect(res.body.discussion).toHaveProperty('id');
      expect(res.body.discussion.space_id).toBe(TEST_SPACE_ID);
    });

    it('creates a discussion without story_id', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/discussions?token=${TEST_TOKEN}`)
        .send({ discussion: {} })
        .expect(201);

      expect(res.body).toHaveProperty('discussion');
      expect(res.body.discussion).toHaveProperty('id');
    });
  });

  describe('Comments CRUD', () => {
    let discussionId: number;
    let commentId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/spaces/${TEST_SPACE_ID}/discussions?token=${TEST_TOKEN}`)
        .send({ discussion: { story_id: 7001 } });
      discussionId = res.body.discussion.id;
    });

    describe('GET /v1/spaces/:spaceId/discussions/:discussionId/comments', () => {
      it('returns list of comments', async () => {
        const res = await request(app.getHttpServer())
          .get(
            `/v1/spaces/${TEST_SPACE_ID}/discussions/${discussionId}/comments?token=${TEST_TOKEN}`,
          )
          .expect(200);

        expect(res.body).toHaveProperty('comments');
        expect(Array.isArray(res.body.comments)).toBe(true);
      });
    });

    describe('POST /v1/spaces/:spaceId/discussions/:discussionId/comments', () => {
      it('creates a comment', async () => {
        const res = await request(app.getHttpServer())
          .post(
            `/v1/spaces/${TEST_SPACE_ID}/discussions/${discussionId}/comments?token=${TEST_TOKEN}`,
          )
          .send({
            comment: {
              message: 'Hello, world!',
              message_json: [{ type: 'text', text: 'Hello, world!' }],
            },
          })
          .expect(201);

        expect(res.body).toHaveProperty('comment');
        expect(res.body.comment).toHaveProperty('id');
        expect(res.body.comment).toHaveProperty('uuid');
        expect(res.body.comment.message).toBe('Hello, world!');
        expect(res.body.comment.discussion_id).toBe(discussionId);
        expect(res.body.comment.space_id).toBe(TEST_SPACE_ID);

        commentId = res.body.comment.id;
      });
    });

    describe('GET /v1/spaces/:spaceId/discussions/:discussionId/comments/:commentId', () => {
      it('returns a single comment by id', async () => {
        const res = await request(app.getHttpServer())
          .get(
            `/v1/spaces/${TEST_SPACE_ID}/discussions/${discussionId}/comments/${commentId}?token=${TEST_TOKEN}`,
          )
          .expect(200);

        expect(res.body).toHaveProperty('comment');
        expect(res.body.comment.id).toBe(commentId);
        expect(res.body.comment.message).toBe('Hello, world!');
      });

      it('returns 404 for non-existent comment', async () => {
        return request(app.getHttpServer())
          .get(
            `/v1/spaces/${TEST_SPACE_ID}/discussions/${discussionId}/comments/999999999?token=${TEST_TOKEN}`,
          )
          .expect(404);
      });
    });

    describe('PUT /v1/spaces/:spaceId/discussions/:discussionId/comments/:commentId', () => {
      it('updates a comment', async () => {
        const res = await request(app.getHttpServer())
          .put(
            `/v1/spaces/${TEST_SPACE_ID}/discussions/${discussionId}/comments/${commentId}?token=${TEST_TOKEN}`,
          )
          .send({
            comment: {
              message: 'Updated message',
            },
          })
          .expect(200);

        expect(res.body).toHaveProperty('comment');
        expect(res.body.comment.message).toBe('Updated message');
        expect(res.body.comment.id).toBe(commentId);
      });
    });

    describe('DELETE /v1/spaces/:spaceId/discussions/:discussionId/comments/:commentId', () => {
      it('deletes a comment and returns 200 with empty object', async () => {
        const res = await request(app.getHttpServer())
          .delete(
            `/v1/spaces/${TEST_SPACE_ID}/discussions/${discussionId}/comments/${commentId}?token=${TEST_TOKEN}`,
          )
          .expect(200);

        expect(res.body).toEqual({});
      });

      it('returns 404 after deletion', async () => {
        return request(app.getHttpServer())
          .get(
            `/v1/spaces/${TEST_SPACE_ID}/discussions/${discussionId}/comments/${commentId}?token=${TEST_TOKEN}`,
          )
          .expect(404);
      });
    });
  });
});
