import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { and, asc, eq, ilike, notInArray, or, sql, count } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { spaceMembers, spaces, users } from '../db/schema';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WEBHOOK_ACTIONS } from '../webhooks/webhook-actions';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private db: DbType,
    private readonly webhooks: WebhooksService,
  ) {}

  async getAllUsers(opts: {
    page: number;
    perPage: number;
    search?: string;
    filter?: 'all' | 'internal' | 'disabled';
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    const { page, perPage, search, filter = 'all', sortBy = 'firstname', sortDir = 'asc' } = opts;

    const conditions: ReturnType<typeof eq>[] = [];

    if (filter === 'disabled') {
      conditions.push(eq(users.disabled, true));
    } else {
      conditions.push(eq(users.disabled, false));
      if (filter === 'internal') {
        conditions.push(ilike(users.email, '%@telekom.sk'));
      }
    }

    if (search) {
      const q = `%${search}%`;
      conditions.push(
        or(
          ilike(users.firstname, q),
          ilike(users.lastname, q),
          ilike(users.email, q),
        ) as ReturnType<typeof eq>,
      );
    }

    const where = and(...conditions);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(users)
      .where(where);

    const dir = sortDir === 'desc' ? 'DESC' : 'ASC';
    const roleOrder = sql`(EXISTS (SELECT 1 FROM space_members sm WHERE sm.user_id = users.id AND sm.role = 'admin'))`;

    const orderExpr =
      sortBy === 'role'
        ? sql`${roleOrder} ${sql.raw(dir === 'ASC' ? 'DESC' : 'ASC')}, ${users.firstname} ASC`
        : sortBy === 'email'
          ? sql`${users.email} ${sql.raw(dir)}`
          : sortBy === 'lastname'
            ? sql`${users.lastname} ${sql.raw(dir)}, ${users.firstname} ASC`
            : sql`${users.firstname} ${sql.raw(dir)}, ${users.lastname} ASC`;

    const rows = await this.db
      .select()
      .from(users)
      .where(where)
      .orderBy(orderExpr)
      .limit(perPage)
      .offset((page - 1) * perPage);

    const userIds = rows.map((u) => u.id);

    const memberships = userIds.length > 0
      ? await this.db
          .select({
            userId: spaceMembers.userId,
            spaceId: spaceMembers.spaceId,
            spaceName: spaces.name,
            role: spaceMembers.role,
          })
          .from(spaceMembers)
          .leftJoin(spaces, eq(spaceMembers.spaceId, spaces.id))
          .where(sql`${spaceMembers.userId} = ANY(${sql.raw(`ARRAY[${userIds.join(',')}]`)})`)
      : [];

    const membershipsByUser = new Map<number, typeof memberships>();
    for (const m of memberships) {
      if (!membershipsByUser.has(m.userId)) membershipsByUser.set(m.userId, []);
      membershipsByUser.get(m.userId)!.push(m);
    }

    const isAdmin = (userId: number) =>
      (membershipsByUser.get(userId) ?? []).some((m) => m.role === 'admin');

    return {
      users: rows.map((u) => ({
        id: u.id,
        firstname: u.firstname,
        lastname: u.lastname,
        name: `${u.firstname} ${u.lastname}`.trim(),
        email: u.email,
        avatar: u.avatar,
        disabled: u.disabled,
        role: isAdmin(u.id) ? 'admin' : 'member',
        spaces: (membershipsByUser.get(u.id) ?? []).map((m) => ({
          id: m.spaceId,
          name: m.spaceName ?? `Space ${m.spaceId}`,
          role: m.role,
        })),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      total: Number(total),
      page,
      perPage,
    };
  }

  async deleteUser(id: number) {
    await this.db.delete(users).where(eq(users.id, id));
    return { success: true };
  }

  async getMe(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      avatar: user.avatar,
      favourite_spaces: (user.favouriteSpaces as number[]) ?? [],
    };
  }

  async updateAvatar(email: string, avatarPath: string) {
    const [updated] = await this.db
      .update(users)
      .set({ avatar: avatarPath, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    return updated ?? null;
  }

  async updateUser(id: number, dto: { firstname?: string; lastname?: string; disabled?: boolean; favouriteSpaces?: number[] }) {
    const patch: Record<string, any> = { updatedAt: new Date() };
    if (dto.firstname !== undefined) patch.firstname = dto.firstname;
    if (dto.lastname !== undefined) patch.lastname = dto.lastname;
    if (dto.disabled !== undefined) patch.disabled = dto.disabled;
    if (dto.favouriteSpaces !== undefined) patch.favouriteSpaces = dto.favouriteSpaces;

    const [updated] = await this.db
      .update(users)
      .set(patch)
      .where(eq(users.id, id))
      .returning();

    return {
      id: updated.id,
      firstname: updated.firstname,
      lastname: updated.lastname,
      email: updated.email,
      favourite_spaces: (updated.favouriteSpaces as number[]) ?? [],
    };
  }

  async createUser(dto: { firstname: string; lastname: string; email: string }) {
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('User with this email already exists');
    }

    const uuid = randomBytes(16).toString('hex');
    const [created] = await this.db
      .insert(users)
      .values({ uuid, email: dto.email, firstname: dto.firstname, lastname: dto.lastname })
      .returning();

    return {
      id: created.id,
      firstname: created.firstname,
      lastname: created.lastname,
      email: created.email,
      disabled: created.disabled,
      createdAt: created.createdAt,
    };
  }

  async getSpaceMembers(spaceId: number) {
    const rows = await this.db
      .select()
      .from(spaceMembers)
      .innerJoin(users, eq(spaceMembers.userId, users.id))
      .where(eq(spaceMembers.spaceId, spaceId))
      .orderBy(asc(users.firstname));

    return {
      collaborators: rows.map((r) => ({
        id: r.space_members.id,
        userId: r.users.id,
        role: r.space_members.role,
        spaceRoleId: r.space_members.spaceRoleId ? Number(r.space_members.spaceRoleId) : null,
        spaceRoleIds: (r.space_members.spaceRoleIds as number[]) ?? [],
        user: {
          id: r.users.id,
          firstname: r.users.firstname,
          lastname: r.users.lastname,
          email: r.users.email,
          avatar: r.users.avatar,
          disabled: r.users.disabled,
        },
      })),
    };
  }

  async addSpaceMember(
    spaceId: number,
    userId: number,
    role: string,
    spaceRoleId?: number | null,
    spaceRoleIds?: number[],
  ) {
    const [existing] = await this.db
      .select()
      .from(spaceMembers)
      .where(and(eq(spaceMembers.spaceId, spaceId), eq(spaceMembers.userId, userId)))
      .limit(1);

    if (existing) throw new ConflictException('User is already a member of this space');

    const [created] = await this.db
      .insert(spaceMembers)
      .values({
        spaceId,
        userId,
        role,
        spaceRoleId: spaceRoleId ? BigInt(spaceRoleId) : null,
        spaceRoleIds: spaceRoleIds ?? [],
      })
      .returning();

    void this.webhooks.dispatch(spaceId, WEBHOOK_ACTIONS.USER_ADDED, {
      action: 'user_added',
      space_id: spaceId,
      user_id: userId,
      role,
      text: `User ${userId} was added to space ${spaceId}.`,
    });

    return { id: created.id };
  }

  async updateSpaceMember(
    spaceId: number,
    memberId: number,
    dto: { role?: string; spaceRoleId?: number | null; spaceRoleIds?: number[] },
  ) {
    const [updated] = await this.db
      .update(spaceMembers)
      .set({
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.spaceRoleId !== undefined && { spaceRoleId: dto.spaceRoleId ? BigInt(dto.spaceRoleId) : null }),
        ...(dto.spaceRoleIds !== undefined && { spaceRoleIds: dto.spaceRoleIds }),
      })
      .where(and(eq(spaceMembers.id, memberId), eq(spaceMembers.spaceId, spaceId)))
      .returning();

    return { id: updated.id };
  }

  async removeSpaceMember(spaceId: number, memberId: number) {
    const [member] = await this.db
      .select({ userId: spaceMembers.userId })
      .from(spaceMembers)
      .where(and(eq(spaceMembers.id, memberId), eq(spaceMembers.spaceId, spaceId)))
      .limit(1);

    await this.db
      .delete(spaceMembers)
      .where(and(eq(spaceMembers.id, memberId), eq(spaceMembers.spaceId, spaceId)));

    if (member) {
      void this.webhooks.dispatch(spaceId, WEBHOOK_ACTIONS.USER_REMOVED, {
        action: 'user_removed',
        space_id: spaceId,
        user_id: member.userId,
        text: `User ${member.userId} was removed from space ${spaceId}.`,
      });
    }

    return { success: true };
  }

  async searchUsersForSpace(spaceId: number, query: string) {
    const q = `%${query}%`;

    const members = await this.db
      .select({ userId: spaceMembers.userId })
      .from(spaceMembers)
      .where(eq(spaceMembers.spaceId, spaceId));

    const memberUserIds = members.map((m) => m.userId);

    const searchCond = or(
      ilike(users.firstname, q),
      ilike(users.lastname, q),
      ilike(users.email, q),
    ) as ReturnType<typeof eq>;

    const conditions = [searchCond, eq(users.disabled, false)] as ReturnType<typeof eq>[];
    if (memberUserIds.length > 0) {
      conditions.push(notInArray(users.id, memberUserIds) as ReturnType<typeof eq>);
    }

    const rows = await this.db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(asc(users.firstname))
      .limit(20);

    return {
      users: rows.map((u) => ({
        id: u.id,
        firstname: u.firstname,
        lastname: u.lastname,
        email: u.email,
        avatar: u.avatar,
      })),
    };
  }

  async findUserByEmail(email: string) {
    const [row] = await this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ?? null;
  }

  async getCollaboratorByUserId(spaceId: number, userId: number) {
    const [row] = await this.db
      .select()
      .from(spaceMembers)
      .innerJoin(users, eq(spaceMembers.userId, users.id))
      .where(and(eq(spaceMembers.userId, userId), eq(spaceMembers.spaceId, spaceId)))
      .limit(1);

    if (!row) return null;

    return {
      collaborator: {
        id: row.space_members.id,
        user_id: row.users.id,
        space_id: row.space_members.spaceId,
        role: row.space_members.role,
        space_role_id: row.space_members.spaceRoleId
          ? Number(row.space_members.spaceRoleId)
          : null,
        space_role_ids: [],
        permissions: row.space_members.permissions ?? [],
        allowed_path: row.space_members.allowedPath,
        field_permissions: '',
        invitation: null,
        user: {
          id: row.users.id,
          friendly_name: `${row.users.firstname} ${row.users.lastname}`.trim(),
          firstname: row.users.firstname,
          lastname: row.users.lastname,
          avatar: row.users.avatar ?? null,
          userid: row.users.email,
          real_email: row.users.email,
          alt_email: null,
          disabled: row.users.disabled,
        },
      },
    };
  }

  async getCollaboratorById(spaceId: number, memberId: number) {
    const [row] = await this.db
      .select()
      .from(spaceMembers)
      .innerJoin(users, eq(spaceMembers.userId, users.id))
      .where(and(eq(spaceMembers.id, memberId), eq(spaceMembers.spaceId, spaceId)))
      .limit(1);

    if (!row) return null;

    return {
      collaborator: {
        id: row.space_members.id,
        user_id: row.users.id,
        space_id: row.space_members.spaceId,
        role: row.space_members.role,
        space_role_id: row.space_members.spaceRoleId
          ? Number(row.space_members.spaceRoleId)
          : null,
        space_role_ids: [],
        permissions: row.space_members.permissions ?? [],
        allowed_path: row.space_members.allowedPath,
        field_permissions: '',
        invitation: null,
        user: {
          id: row.users.id,
          friendly_name: `${row.users.firstname} ${row.users.lastname}`.trim(),
          firstname: row.users.firstname,
          lastname: row.users.lastname,
          avatar: row.users.avatar ?? null,
          userid: row.users.email,
          real_email: row.users.email,
          alt_email: null,
          disabled: row.users.disabled,
        },
      },
    };
  }

  async getCollaborators(spaceId: number, opts?: { page?: number; perPage?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const perPage = Math.min(100, Math.max(1, opts?.perPage ?? 25));

    const rows = await this.db
      .select()
      .from(spaceMembers)
      .innerJoin(users, eq(spaceMembers.userId, users.id))
      .where(eq(spaceMembers.spaceId, spaceId))
      .limit(perPage)
      .offset((page - 1) * perPage);

    // Storyblok MAPI /collaborators response shape
    return {
      collaborators: rows.map((r) => ({
        id: r.space_members.id,
        user_id: r.users.id,
        space_id: r.space_members.spaceId,
        role: r.space_members.role,
        space_role_id: r.space_members.spaceRoleId
          ? Number(r.space_members.spaceRoleId)
          : null,
        space_role_ids: [],
        permissions: r.space_members.permissions ?? [],
        allowed_path: r.space_members.allowedPath,
        field_permissions: '',
        invitation: null,
        user: {
          id: r.users.id,
          friendly_name: `${r.users.firstname} ${r.users.lastname}`.trim(),
          firstname: r.users.firstname,
          lastname: r.users.lastname,
          avatar: r.users.avatar ?? null,
          userid: r.users.email,
          real_email: r.users.email,
          alt_email: null,
          disabled: r.users.disabled,
        },
      })),
    };
  }
}
