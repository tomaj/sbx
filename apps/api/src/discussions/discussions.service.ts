import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { discussions, comments, users, stories } from '../db/schema';

@Injectable()
export class DiscussionsService {
  constructor(@Inject(DB) private db: DbType) {}

  async createDiscussion(spaceId: number, storyId?: number, fieldKey?: string) {
    const [created] = await this.db
      .insert(discussions)
      .values({
        spaceId,
        storyId: storyId ?? null,
        fieldKey: fieldKey ?? null,
      })
      .returning();

    return this.formatDiscussion(created);
  }

  async getOrCreateDiscussionForField(spaceId: number, storyId: number, fieldKey: string) {
    const [existing] = await this.db
      .select()
      .from(discussions)
      .where(
        and(
          eq(discussions.spaceId, spaceId),
          eq(discussions.storyId, storyId),
          eq(discussions.fieldKey, fieldKey),
          isNull(discussions.resolvedAt),
        ),
      )
      .limit(1);

    if (existing) return { discussion: this.formatDiscussion(existing) };

    const [created] = await this.db
      .insert(discussions)
      .values({ spaceId, storyId, fieldKey })
      .returning();

    return { discussion: this.formatDiscussion(created) };
  }

  async findOrCreateDiscussion(spaceId: number, discussionId: number) {
    const [row] = await this.db
      .select()
      .from(discussions)
      .where(and(eq(discussions.id, discussionId), eq(discussions.spaceId, spaceId)))
      .limit(1);

    return row ?? null;
  }

  async listByStory(spaceId: number, storyId: number, resolved: boolean = false) {
    const disc = await this.db
      .select()
      .from(discussions)
      .where(
        and(
          eq(discussions.spaceId, spaceId),
          eq(discussions.storyId, storyId),
          resolved ? isNotNull(discussions.resolvedAt) : isNull(discussions.resolvedAt),
        ),
      )
      .orderBy(desc(discussions.createdAt));

    if (disc.length === 0) return { discussions: [] };

    const discIds = disc.map((d) => d.id);

    const allComments = await this.db
      .select({
        id: comments.id,
        discussionId: comments.discussionId,
        spaceId: comments.spaceId,
        userId: comments.userId,
        message: comments.message,
        messageJson: comments.messageJson,
        uuid: comments.uuid,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        userFirstname: users.firstname,
        userLastname: users.lastname,
        userAvatar: users.avatar,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.userId))
      .where(and(eq(comments.spaceId, spaceId), inArray(comments.discussionId, discIds)))
      .orderBy(comments.createdAt);

    const commentsByDiscussion = allComments.reduce(
      (acc, c) => {
        const id = Number(c.discussionId);
        if (!acc[id]) acc[id] = [];
        acc[id].push(this.formatCommentWithUser(c));
        return acc;
      },
      {} as Record<number, any[]>,
    );

    return {
      discussions: disc
        .map((d) => ({
          ...this.formatDiscussion(d),
          comments: commentsByDiscussion[Number(d.id)] ?? [],
        }))
        .filter((d) => d.comments.length > 0),
    };
  }

  async resolveDiscussion(spaceId: number, discussionId: number) {
    const [updated] = await this.db
      .update(discussions)
      .set({ resolvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(discussions.id, discussionId), eq(discussions.spaceId, spaceId)))
      .returning();

    if (!updated) return null;
    return { discussion: this.formatDiscussion(updated) };
  }

  async unresolveDiscussion(spaceId: number, discussionId: number) {
    const [updated] = await this.db
      .update(discussions)
      .set({ resolvedAt: null, updatedAt: new Date() })
      .where(and(eq(discussions.id, discussionId), eq(discussions.spaceId, spaceId)))
      .returning();

    if (!updated) return null;
    return { discussion: this.formatDiscussion(updated) };
  }

  async listComments(spaceId: number, discussionId: number) {
    const rows = await this.db
      .select({
        id: comments.id,
        discussionId: comments.discussionId,
        spaceId: comments.spaceId,
        userId: comments.userId,
        message: comments.message,
        messageJson: comments.messageJson,
        uuid: comments.uuid,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        userFirstname: users.firstname,
        userLastname: users.lastname,
        userAvatar: users.avatar,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.userId))
      .where(and(eq(comments.discussionId, discussionId), eq(comments.spaceId, spaceId)))
      .orderBy(comments.createdAt);

    return { comments: rows.map((r) => this.formatCommentWithUser(r)) };
  }

  async getComment(spaceId: number, discussionId: number, commentId: number) {
    const [row] = await this.db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.id, commentId),
          eq(comments.discussionId, discussionId),
          eq(comments.spaceId, spaceId),
        ),
      )
      .limit(1);

    if (!row) return null;
    return { comment: this.formatComment(row) };
  }

  async createComment(
    spaceId: number,
    discussionId: number,
    data: { message?: string; message_json?: any[]; user_id?: number; user_email?: string; user_name?: string },
  ) {
    const uuid = crypto.randomUUID();

    // Resolve user_id from email; auto-create SBX user from better-auth data if missing
    let userId = data.user_id ?? null;
    if (!userId && data.user_email) {
      const [existing] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, data.user_email))
        .limit(1);

      if (existing) {
        userId = existing.id;
      } else {
        // Auto-create user from session data (better-auth user not yet in SBX users table)
        const parts = (data.user_name ?? '').split(' ');
        const firstname = parts[0] || data.user_email.split('@')[0];
        const lastname = parts.slice(1).join(' ');
        const [created] = await this.db
          .insert(users)
          .values({ uuid: crypto.randomUUID(), email: data.user_email, firstname, lastname })
          .returning({ id: users.id });
        userId = created?.id ?? null;
      }
    }

    const [created] = await this.db
      .insert(comments)
      .values({
        spaceId,
        discussionId,
        uuid,
        message: data.message ?? null,
        messageJson: data.message_json ?? [],
        userId,
      })
      .returning();

    return { comment: this.formatComment(created) };
  }

  async updateComment(
    spaceId: number,
    discussionId: number,
    commentId: number,
    data: { message?: string; message_json?: any[] },
  ) {
    const [updated] = await this.db
      .update(comments)
      .set({
        ...(data.message !== undefined && { message: data.message }),
        ...(data.message_json !== undefined && { messageJson: data.message_json }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(comments.id, commentId),
          eq(comments.discussionId, discussionId),
          eq(comments.spaceId, spaceId),
        ),
      )
      .returning();

    if (!updated) return null;
    return { comment: this.formatComment(updated) };
  }

  async findMentions(spaceId: number, userName: string, page = 1, perPage = 10) {
    const pattern = `%@${userName}%`;
    const offset = (page - 1) * perPage;

    const rows = await this.db
      .select({
        id: comments.id,
        discussionId: comments.discussionId,
        spaceId: comments.spaceId,
        userId: comments.userId,
        message: comments.message,
        uuid: comments.uuid,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        userFirstname: users.firstname,
        userLastname: users.lastname,
        userAvatar: users.avatar,
        storyId: discussions.storyId,
        fieldKey: discussions.fieldKey,
        storyName: stories.name,
        storyFullSlug: stories.fullSlug,
      })
      .from(comments)
      .innerJoin(discussions, eq(discussions.id, comments.discussionId))
      .leftJoin(users, eq(users.id, comments.userId))
      .leftJoin(stories, and(sql`${stories.id} = ${discussions.storyId}`, eq(stories.spaceId, spaceId)))
      .where(and(eq(comments.spaceId, spaceId), ilike(comments.message, pattern)))
      .orderBy(desc(comments.createdAt))
      .limit(perPage)
      .offset(offset);

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .innerJoin(discussions, eq(discussions.id, comments.discussionId))
      .where(and(eq(comments.spaceId, spaceId), ilike(comments.message, pattern)));

    const total = totalResult[0]?.count ?? 0;

    return {
      comments: rows.map((r) => ({
        id: Number(r.id),
        uuid: r.uuid,
        discussion_id: Number(r.discussionId),
        space_id: r.spaceId,
        user_id: r.userId ? Number(r.userId) : null,
        user_name: [r.userFirstname, r.userLastname].filter(Boolean).join(' ') || null,
        user_avatar: r.userAvatar ?? null,
        message: r.message ?? null,
        field_key: r.fieldKey ?? null,
        story_id: r.storyId ? Number(r.storyId) : null,
        story_name: r.storyName ?? null,
        story_full_slug: r.storyFullSlug ?? null,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      })),
      total,
    };
  }

  async deleteComment(spaceId: number, discussionId: number, commentId: number) {
    await this.db
      .delete(comments)
      .where(
        and(
          eq(comments.id, commentId),
          eq(comments.discussionId, discussionId),
          eq(comments.spaceId, spaceId),
        ),
      );

    // Auto-delete the discussion if it has no remaining comments
    const [remaining] = await this.db
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.discussionId, discussionId), eq(comments.spaceId, spaceId)))
      .limit(1);

    if (!remaining) {
      await this.db
        .delete(discussions)
        .where(and(eq(discussions.id, discussionId), eq(discussions.spaceId, spaceId)));
    }

    return {};
  }

  private formatDiscussion(r: typeof discussions.$inferSelect) {
    return {
      id: Number(r.id),
      space_id: r.spaceId,
      story_id: r.storyId ? Number(r.storyId) : null,
      field_key: r.fieldKey ?? null,
      resolved_at: r.resolvedAt ?? null,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }

  private formatComment(r: typeof comments.$inferSelect) {
    return {
      id: Number(r.id),
      uuid: r.uuid,
      discussion_id: Number(r.discussionId),
      space_id: r.spaceId,
      user_id: r.userId ? Number(r.userId) : null,
      message: r.message ?? null,
      message_json: r.messageJson,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }

  private formatCommentWithUser(
    r: typeof comments.$inferSelect & {
      userFirstname?: string | null;
      userLastname?: string | null;
      userAvatar?: string | null;
    },
  ) {
    const name =
      [r.userFirstname, r.userLastname].filter(Boolean).join(' ') || null;
    return {
      id: Number(r.id),
      uuid: r.uuid,
      discussion_id: Number(r.discussionId),
      space_id: r.spaceId,
      user_id: r.userId ? Number(r.userId) : null,
      user_name: name,
      user_avatar: r.userAvatar ?? null,
      message: r.message ?? null,
      message_json: r.messageJson,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }
}
