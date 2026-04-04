import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { storyVersions } from '../db/schema';

export interface LogVersionParams {
  storyId: number;
  spaceId: number;
  userId?: number | null;
  releaseId?: number | null;
  action: 'create' | 'save' | 'publish' | 'unpublish';
  status: 'draft' | 'published' | 'unpublished';
  name: string;
  slug: string;
  fullSlug: string;
  content: Record<string, any>;
  tagList: any;
  path?: string | null;
  isStartpage?: boolean;
}

@Injectable()
export class StoriesVersionService {
  private readonly logger = new Logger(StoriesVersionService.name);

  constructor(@Inject(DB) private db: DbType) {}

  /**
   * Fire-and-forget version logging — never blocks the main flow.
   * Logs a warning on failure instead of silently swallowing errors.
   */
  logVersion(params: LogVersionParams) {
    void this.db
      .execute(sql`SELECT nextval('story_versions_id_seq')`)
      .then(({ rows }) => {
        const versionId = Number((rows[0] as any).nextval);
        return this.db.insert(storyVersions).values({
          id: versionId,
          storyId: params.storyId,
          spaceId: params.spaceId,
          userId: params.userId ?? null,
          releaseId: params.releaseId ?? null,
          action: params.action,
          status: params.status,
          name: params.name,
          slug: params.slug,
          fullSlug: params.fullSlug,
          content: params.content,
          tagList: params.tagList ?? [],
          path: params.path ?? null,
          isStartpage: params.isStartpage ?? false,
        });
      })
      .catch((err) => {
        this.logger.warn(`Failed to log story version for story ${params.storyId}: ${err.message}`);
      });
  }
}
