import { Request } from 'express';
import { spaces, apiTokens } from '../db/schema';

export type SpaceRow = typeof spaces.$inferSelect;
export type ApiTokenRow = typeof apiTokens.$inferSelect;

export interface AdminUser {
  userId: string;
  email: string;
  name: string;
  /** Internal users.id (bigint) — JWT payload.sub */
  sbxUserId: number | null;
  /** Optional user fields that may be populated from extended DB lookups */
  firstname?: string;
  lastname?: string;
}

/**
 * Extract author information from the authenticated request.
 * Returns { id, name } for use in audit/version tracking.
 */
export function extractAuthorInfo(req: AuthenticatedRequest): {
  id: number | null;
  name: string | null;
} {
  const user = req.adminUser;
  if (!user) return { id: null, name: null };
  const name = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.email || null;
  return { id: user.sbxUserId ?? null, name };
}

/**
 * Express Request augmented with auth properties set by UnifiedAuthGuard.
 * Guards ensure these are populated before controllers run.
 * Use the non-null assertion operator (!) when accessing optional properties
 * if you are certain the guard has set them for the route.
 */
export interface AuthenticatedRequest extends Request {
  /** Set by session auth (JWT session) */
  adminUser: AdminUser;
  /** Set by token auth (API token) */
  apiToken: ApiTokenRow;
  /** Set by token auth or session-or-token strategy */
  space: SpaceRow;
  /** Set by JwtGuard */
  user: { sub: string; email: string; [key: string]: unknown };
}
