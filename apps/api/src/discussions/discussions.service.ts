import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { JOBS_CLIENT } from '../jobs/jobs.module';
import type { JobsClient } from '@sbx/jobs';
import { discussions, comments, users, stories } from '../db/schema';

@Injectable()
export class DiscussionsService {
  constructor(
    @Inject(DB) private db: DbType,
    @Inject(JOBS_CLIENT) private jobs: JobsClient,
  ) {}

  /**
   * POST /v1/spaces/:spaceId/stories/:storyId/discussions
   */
  async createDiscussion(
    spaceId: number,
    storyId: number,
    data: {
      block_uid?: string;
      title?: string;
      fieldname?: string;
      component?: string;
      lang?: string;
      comment?: { message?: string; message_json?: any[] };
    },
    adminUser?: { id?: number; email?: string; name?: string },
  ) {
    const uuid = crypto.randomUUID();

    const [created] = await this.db
      .insert(discussions)
      .values({
        spaceId,
        storyId,
        uuid,
        title: data.title ?? null,
        blockUid: data.block_uid ?? null,
        fieldname: data.fieldname ?? null,
        fieldKey: data.fieldname ?? null,
        component: data.component ?? null,
        lang: data.lang ?? null,
      })
      .returning();

    // Create the initial comment if provided
    if (data.comment) {
      await this.createCommentInternal(spaceId, created.id, data.comment, adminUser);
    }

    // Re-fetch with last_comment
    const disc = await this.getDiscussionWithLastComment(spaceId, created.id);
    return { discussion: disc };
  }

  /**
   * GET /v1/spaces/:spaceId/discussions/:discussionId
   */
  async getDiscussion(spaceId: number, discussionId: number) {
    return this.getDiscussionWithLastComment(spaceId, discussionId);
  }

  /**
   * PUT /v1/spaces/:spaceId/discussions/:discussionId
   * Used to resolve/unresolve a discussion via solved_at field.
   */
  async updateDiscussion(
    spaceId: number,
    discussionId: number,
    data: { solved_at?: string | null },
  ) {
    const solvedAt = data.solved_at !== undefined
      ? (data.solved_at ? new Date(data.solved_at) : null)
      : undefined;

    const updateSet: Record<string, any> = { updatedAt: new Date() };
    if (solvedAt !== undefined) {
      updateSet.solvedAt = solvedAt;
      updateSet.resolvedAt = solvedAt;
    }

    const [updated] = await this.db
      .update(discussions)
      .set(updateSet)
      .where(and(eq(discussions.id, discussionId), eq(discussions.spaceId, spaceId)))
      .returning();

    if (!updated) return null;
    return this.getDiscussionWithLastComment(spaceId, updated.id);
  }

  /**
   * DELETE /v1/spaces/:spaceId/discussions/:discussionId
   */
  async deleteDiscussion(spaceId: number, discussionId: number) {
    await this.db
      .delete(discussions)
      .where(and(eq(discussions.id, discussionId), eq(discussions.spaceId, spaceId)));
  }

  /**
   * GET /v1/spaces/:spaceId/stories/:storyId/discussions
   */
  async listByStory(
    spaceId: number,
    storyId: number,
    page: number = 1,
    perPage: number = 25,
    byStatus?: string,
  ) {
    const conditions = [
      eq(discussions.spaceId, spaceId),
      eq(discussions.storyId, storyId),
    ];

    if (byStatus === 'solved') {
      conditions.push(isNotNull(discussions.solvedAt));
    } else if (byStatus === 'unsolved') {
      conditions.push(isNull(discussions.solvedAt));
    }

    const offset = (page - 1) * perPage;

    const disc = await this.db
      .select()
      .from(discussions)
      .where(and(...conditions))
      .orderBy(desc(discussions.createdAt))
      .limit(perPage)
      .offset(offset);

    if (disc.length === 0) return { discussions: [] };

    const discIds = disc.map((d) => d.id);

    // Fetch last comment for each discussion
    const allComments = await this.db
      .select({
        id: comments.id,
        discussionId: comments.discussionId,
        userId: comments.userId,
        message: comments.message,
        messageJson: comments.messageJson,
        uuid: comments.uuid,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .where(and(eq(comments.spaceId, spaceId), inArray(comments.discussionId, discIds)))
      .orderBy(desc(comments.createdAt));

    const lastCommentByDiscussion: Record<number, any> = {};
    for (const c of allComments) {
      const did = Number(c.discussionId);
      if (!lastCommentByDiscussion[did]) {
        lastCommentByDiscussion[did] = {
          id: Number(c.id),
          created_at: c.createdAt,
          updated_at: c.updatedAt,
          message: c.message ?? null,
          message_json: c.messageJson,
          user_id: c.userId ? Number(c.userId) : null,
          uuid: c.uuid,
        };
      }
    }

    return {
      discussions: disc.map((d) => ({
        ...this.formatDiscussion(d),
        last_comment: lastCommentByDiscussion[Number(d.id)] ?? null,
      })),
    };
  }

  /**
   * GET /v1/spaces/:spaceId/mentioned_discussions/me
   */
  async findMentionedDiscussions(
    spaceId: number,
    userId: number,
    page: number = 1,
    perPage: number = 25,
    byStatus?: string,
  ) {
    const offset = (page - 1) * perPage;

    // Find discussions where the user is mentioned in comments (via message_json mention attrs)
    const userIdStr = String(userId);

    const conditions = [
      eq(comments.spaceId, spaceId),
      or(
        sql`${comments.message}::text LIKE '%@%'`,
        sql`${comments.messageJson}::text LIKE ${'%"type":"mention"%'}`,
      ),
    ];

    // Get discussion IDs where user is mentioned
    const mentionedComments = await this.db
      .select({ discussionId: comments.discussionId })
      .from(comments)
      .where(and(...conditions));

    const mentionedDiscIds = [...new Set(mentionedComments.map((c) => Number(c.discussionId)))];
    if (mentionedDiscIds.length === 0) return { discussions: [] };

    const discConditions = [
      eq(discussions.spaceId, spaceId),
      inArray(discussions.id, mentionedDiscIds),
    ];

    if (byStatus === 'solved') {
      discConditions.push(isNotNull(discussions.solvedAt));
    } else if (byStatus === 'unsolved') {
      discConditions.push(isNull(discussions.solvedAt));
    }

    const disc = await this.db
      .select()
      .from(discussions)
      .where(and(...discConditions))
      .orderBy(desc(discussions.createdAt))
      .limit(perPage)
      .offset(offset);

    if (disc.length === 0) return { discussions: [] };

    const discIds = disc.map((d) => d.id);
    const allComments = await this.db
      .select({
        id: comments.id,
        discussionId: comments.discussionId,
        userId: comments.userId,
        message: comments.message,
        messageJson: comments.messageJson,
        uuid: comments.uuid,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .where(and(eq(comments.spaceId, spaceId), inArray(comments.discussionId, discIds)))
      .orderBy(desc(comments.createdAt));

    const lastCommentByDiscussion: Record<number, any> = {};
    for (const c of allComments) {
      const did = Number(c.discussionId);
      if (!lastCommentByDiscussion[did]) {
        lastCommentByDiscussion[did] = {
          id: Number(c.id),
          created_at: c.createdAt,
          updated_at: c.updatedAt,
          message: c.message ?? null,
          message_json: c.messageJson,
          user_id: c.userId ? Number(c.userId) : null,
          uuid: c.uuid,
        };
      }
    }

    return {
      discussions: disc.map((d) => ({
        ...this.formatDiscussion(d),
        last_comment: lastCommentByDiscussion[Number(d.id)] ?? null,
      })),
    };
  }

  /**
   * GET /v1/spaces/:spaceId/discussions/:discussionId/comments
   * Note: discussionId can be either numeric ID or UUID per Storyblok docs.
   */
  async listComments(spaceId: number, discussionIdOrUuid: string) {
    // Determine if it's a numeric ID or UUID
    const isNumeric = /^\d+$/.test(discussionIdOrUuid);

    let discussionId: number;
    if (isNumeric) {
      discussionId = parseInt(discussionIdOrUuid);
    } else {
      // Look up by UUID
      const [disc] = await this.db
        .select({ id: discussions.id })
        .from(discussions)
        .where(and(eq(discussions.uuid, discussionIdOrUuid), eq(discussions.spaceId, spaceId)))
        .limit(1);
      if (!disc) return { comments: [] };
      discussionId = disc.id;
    }

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

  /**
   * POST /v1/spaces/:spaceId/discussions/:discussionId/comments
   */
  async createComment(
    spaceId: number,
    discussionId: number,
    data: { message?: string; message_json?: any[]; user_id?: number; user_email?: string; user_name?: string },
  ) {
    return this.createCommentInternal(spaceId, discussionId, data, {
      email: data.user_email,
      name: data.user_name,
      id: data.user_id,
    });
  }

  /**
   * PUT /v1/spaces/:spaceId/discussions/:discussionId/comments/:commentId
   */
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

  /**
   * DELETE /v1/spaces/:spaceId/discussions/:discussionId/comments/:commentId
   */
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
  }

  // ---- Internal helpers kept for admin UI backward compat via MAPI ----

  /**
   * Get or create a discussion for a field (used by admin field discussion panel).
   * This is implemented as: POST /stories/:storyId/discussions with fieldname,
   * but we keep a convenience method that checks for existing open discussion first.
   */
  async getOrCreateDiscussionForField(spaceId: number, storyId: number, fieldKey: string) {
    const [existing] = await this.db
      .select()
      .from(discussions)
      .where(
        and(
          eq(discussions.spaceId, spaceId),
          eq(discussions.storyId, storyId),
          or(eq(discussions.fieldKey, fieldKey), eq(discussions.fieldname, fieldKey)),
          isNull(discussions.solvedAt),
        ),
      )
      .limit(1);

    if (existing) {
      return { discussion: this.formatDiscussion(existing) };
    }

    const uuid = crypto.randomUUID();
    const [created] = await this.db
      .insert(discussions)
      .values({ spaceId, storyId, fieldKey, fieldname: fieldKey, uuid })
      .returning();

    return { discussion: this.formatDiscussion(created) };
  }

  // ---- Private helpers ----

  private async createCommentInternal(
    spaceId: number,
    discussionId: number,
    data: { message?: string; message_json?: any[] },
    adminUser?: { id?: number; email?: string; name?: string },
  ) {
    const uuid = crypto.randomUUID();

    let userId: number | null = adminUser?.id ?? null;
    if (!userId && adminUser?.email) {
      const [existing] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, adminUser.email))
        .limit(1);

      if (existing) {
        userId = existing.id;
      } else {
        const parts = (adminUser.name ?? '').split(' ');
        const firstname = parts[0] || adminUser.email.split('@')[0];
        const lastname = parts.slice(1).join(' ');
        const [created] = await this.db
          .insert(users)
          .values({ uuid: crypto.randomUUID(), email: adminUser.email, firstname, lastname })
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

    void this.sendCommentNotifications(spaceId, discussionId, userId, data.message ?? null);

    return { comment: this.formatComment(created) };
  }

  private async sendCommentNotifications(
    spaceId: number,
    discussionId: number,
    commenterUserId: number | null,
    messageText: string | null,
  ) {
    // Fetch discussion → storyId
    const [disc] = await this.db
      .select({ storyId: discussions.storyId })
      .from(discussions)
      .where(eq(discussions.id, discussionId))
      .limit(1);

    if (!disc?.storyId) return;

    // Fetch story name + lastAuthorId
    const [story] = await this.db
      .select({ name: stories.name, lastAuthorId: stories.lastAuthorId, fullSlug: stories.fullSlug })
      .from(stories)
      .where(and(eq(stories.id, BigInt(disc.storyId)), eq(stories.spaceId, spaceId)))
      .limit(1);

    if (!story) return;

    const adminUrl = process.env.ADMIN_URL ?? 'http://localhost:3001';
    const storyUrl = `${adminUrl}/spaces/${spaceId}/stories/${disc.storyId}`;
    const storyName = story.name;

    // Collect recipient user IDs: story lastAuthor + previous commenters (excluding commenter)
    const recipientIds = new Set<number>();

    if (story.lastAuthorId && story.lastAuthorId !== commenterUserId) {
      recipientIds.add(story.lastAuthorId);
    }

    // Previous participants in this discussion
    const previousCommenters = await this.db
      .select({ userId: comments.userId })
      .from(comments)
      .where(
        and(
          eq(comments.discussionId, discussionId),
          eq(comments.spaceId, spaceId),
          commenterUserId ? ne(comments.userId, commenterUserId) : undefined,
        ),
      );

    for (const c of previousCommenters) {
      if (c.userId) recipientIds.add(c.userId);
    }

    if (recipientIds.size === 0) return;

    // Fetch commenter name
    let commenterName = 'Someone';
    if (commenterUserId) {
      const [commenter] = await this.db
        .select({ firstname: users.firstname, lastname: users.lastname })
        .from(users)
        .where(eq(users.id, commenterUserId))
        .limit(1);
      if (commenter) {
        commenterName = [commenter.firstname, commenter.lastname].filter(Boolean).join(' ') || commenterName;
      }
    }

    // Fetch recipient emails
    const recipients = await this.db
      .select({ email: users.email })
      .from(users)
      .where(inArray(users.id, [...recipientIds]));

    for (const recipient of recipients) {
      if (!recipient.email) continue;
      void this.jobs.emails.send({
        type: 'comment-notification',
        to: recipient.email,
        storyName,
        commentAuthor: commenterName,
        commentText: messageText ?? '',
        storyUrl,
      });
    }
  }

  private async getDiscussionWithLastComment(spaceId: number, discussionId: number) {
    const [row] = await this.db
      .select()
      .from(discussions)
      .where(and(eq(discussions.id, discussionId), eq(discussions.spaceId, spaceId)))
      .limit(1);

    if (!row) return null;

    // Get last comment
    const [lastComment] = await this.db
      .select()
      .from(comments)
      .where(and(eq(comments.discussionId, discussionId), eq(comments.spaceId, spaceId)))
      .orderBy(desc(comments.createdAt))
      .limit(1);

    return {
      ...this.formatDiscussion(row),
      last_comment: lastComment
        ? {
            id: Number(lastComment.id),
            created_at: lastComment.createdAt,
            updated_at: lastComment.updatedAt,
            message: lastComment.message ?? null,
            message_json: lastComment.messageJson,
            user_id: lastComment.userId ? Number(lastComment.userId) : null,
            uuid: lastComment.uuid,
          }
        : null,
    };
  }

  private formatDiscussion(r: typeof discussions.$inferSelect) {
    return {
      id: Number(r.id),
      title: r.title ?? null,
      block_uid: r.blockUid ?? null,
      fieldname: r.fieldname ?? null,
      solved_at: r.solvedAt ?? null,
      component: r.component ?? null,
      lang: r.lang ?? null,
      uuid: r.uuid,
      // Keep extra fields for backward compat with admin UI
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
