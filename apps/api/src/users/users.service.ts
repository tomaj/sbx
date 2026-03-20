import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { spaceMembers, users } from '../db/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private db: DbType) {}

  async getCollaborators(spaceId: number) {
    const rows = await this.db
      .select()
      .from(spaceMembers)
      .innerJoin(users, eq(spaceMembers.userId, users.id))
      .where(and(eq(spaceMembers.spaceId, spaceId), isNotNull(spaceMembers.sbId)));

    // Storyblok MAPI /collaborators response shape
    return {
      collaborators: rows.map((r) => ({
        id: Number(r.space_members.sbId ?? r.space_members.id),
        user_id: Number(r.users.sbId ?? r.users.id),
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
          id: Number(r.users.sbId ?? r.users.id),
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
