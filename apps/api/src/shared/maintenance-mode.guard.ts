import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DB, type DbType } from '../db/db.module';
import { spaces, spaceMembers } from '../db/schema';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Guard that enforces maintenance mode on a space.
 * When a space has maintenance_mode=true, only users with role='admin'
 * in that space can perform write operations (POST/PUT/PATCH/DELETE).
 * Read operations (GET) are always allowed.
 */
@Injectable()
export class MaintenanceModeGuard implements CanActivate {
  constructor(@Inject(DB) private db: DbType) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Only block write operations
    if (!WRITE_METHODS.has(req.method)) return true;

    const rawSpaceId = Array.isArray(req.params.spaceId)
      ? req.params.spaceId[0]
      : req.params.spaceId;
    const spaceId = parseInt(rawSpaceId, 10);
    if (!Number.isFinite(spaceId)) return true;

    const [space] = await this.db
      .select({ options: spaces.options })
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);

    const maintenance =
      ((space?.options as Record<string, unknown>)?.maintenance as boolean) ?? false;
    if (!maintenance) return true;

    // Space is in maintenance mode — check if user is admin
    const userId = req.adminUser?.sbxUserId;
    if (!userId) {
      throw new ForbiddenException('Space is in maintenance mode. Only admins can edit content.');
    }

    const [member] = await this.db
      .select({ role: spaceMembers.role })
      .from(spaceMembers)
      .where(and(eq(spaceMembers.spaceId, spaceId), eq(spaceMembers.userId, userId)))
      .limit(1);

    if (member?.role === 'admin') return true;

    throw new ForbiddenException('Space is in maintenance mode. Only admins can edit content.');
  }
}
