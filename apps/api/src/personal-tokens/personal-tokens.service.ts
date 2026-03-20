import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { personalAccessTokens } from '../db/schema';

@Injectable()
export class PersonalTokensService {
  constructor(@Inject(DB) private db: DbType) {}

  async getTokens(userId: string) {
    const tokens = await this.db
      .select()
      .from(personalAccessTokens)
      .where(eq(personalAccessTokens.userId, userId));

    return {
      tokens: tokens.map((t) => ({
        id: t.id,
        name: t.name,
        lastFour: t.token.slice(-4),
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
      })),
    };
  }

  async createToken(userId: string, name: string, expiresInDays?: number) {
    const token = randomBytes(24).toString('hex');
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [created] = await this.db
      .insert(personalAccessTokens)
      .values({ userId, name, token, expiresAt })
      .returning();

    return {
      id: created.id,
      name: created.name,
      token, // return full token only on creation
      lastFour: token.slice(-4),
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    };
  }

  async deleteToken(userId: string, id: number) {
    await this.db
      .delete(personalAccessTokens)
      .where(and(eq(personalAccessTokens.id, id), eq(personalAccessTokens.userId, userId)));
    return { success: true };
  }
}
