import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { DiscussionsService } from './discussions.service';
import { ResultGuard } from '../shared/result-guard.util';
import { QueryParserUtil } from '../shared/query-parser.util';

/**
 * Story-scoped discussion routes:
 *   GET  /v1/spaces/:spaceId/stories/:storyId/discussions
 *   POST /v1/spaces/:spaceId/stories/:storyId/discussions
 */
@ApiTags('Discussions - MAPI')
@Controller('v1/spaces/:spaceId/stories/:storyId/discussions')
@Auth('session-or-token')
export class StoryDiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Param('storyId', ParseIntPipe) storyId: number,
    @Query('per_page') perPage: string,
    @Query('page') page: string,
    @Query('by_status') byStatus: string,
  ) {
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(
      page,
      perPage,
    );
    return this.discussionsService.listByStory(
      req.space.id,
      storyId,
      parsedPage,
      parsedPerPage,
      byStatus,
    );
  }

  @Post()
  @HttpCode(201)
  async create(
    @Req() req: AuthenticatedRequest,
    @Param('storyId', ParseIntPipe) storyId: number,
    @Body()
    body: {
      discussion?: {
        block_uid?: string;
        title?: string;
        fieldname?: string;
        component?: string;
        lang?: string;
        comment?: { message?: string; message_json?: any[] };
      };
    },
  ) {
    return this.discussionsService.createDiscussion(req.space.id, storyId, body.discussion ?? {}, {
      id: req.adminUser?.sbxUserId ?? undefined,
      email: req.adminUser?.email,
      name: req.adminUser?.name,
    });
  }
}

/**
 * Discussion-level routes:
 *   GET    /v1/spaces/:spaceId/discussions/:discussionId
 *   PUT    /v1/spaces/:spaceId/discussions/:discussionId
 *   DELETE /v1/spaces/:spaceId/discussions/:discussionId
 */
@ApiTags('Discussions - MAPI')
@Controller('v1/spaces/:spaceId/discussions')
@Auth('session-or-token')
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Get(':discussionId')
  async getOne(
    @Req() req: AuthenticatedRequest,
    @Param('discussionId', ParseIntPipe) discussionId: number,
  ) {
    return {
      discussion: ResultGuard.throwIfNotFound(
        await this.discussionsService.getDiscussion(req.space.id, discussionId),
      ),
    };
  }

  @Put(':discussionId')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('discussionId', ParseIntPipe) discussionId: number,
    @Body() body: { discussion?: { solved_at?: string | null } },
  ) {
    return {
      discussion: ResultGuard.throwIfNotFound(
        await this.discussionsService.updateDiscussion(
          req.space.id,
          discussionId,
          body.discussion ?? {},
        ),
      ),
    };
  }

  @Delete(':discussionId')
  @HttpCode(200)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('discussionId', ParseIntPipe) discussionId: number,
  ) {
    await this.discussionsService.deleteDiscussion(req.space.id, discussionId);
    return {};
  }

  /**
   * Comment routes nested under discussion:
   *   GET    /v1/spaces/:spaceId/discussions/:discussionId/comments
   *   POST   /v1/spaces/:spaceId/discussions/:discussionId/comments
   *   PUT    /v1/spaces/:spaceId/discussions/:discussionId/comments/:commentId
   *   DELETE /v1/spaces/:spaceId/discussions/:discussionId/comments/:commentId
   *
   * Note: GET comments uses discussionId which can be either numeric ID or UUID
   * per the Storyblok docs (`:discussion_uuid`).
   */
  @Get(':discussionId/comments')
  async listComments(
    @Req() req: AuthenticatedRequest,
    @Param('discussionId') discussionId: string,
  ) {
    return this.discussionsService.listComments(req.space.id, discussionId);
  }

  @Post(':discussionId/comments')
  @HttpCode(201)
  async createComment(
    @Req() req: AuthenticatedRequest,
    @Param('discussionId', ParseIntPipe) discussionId: number,
    @Body() body: { comment?: { message?: string; message_json?: any[] } },
  ) {
    return this.discussionsService.createComment(req.space.id, discussionId, {
      ...body.comment,
      user_email: req.adminUser?.email,
      user_name: req.adminUser?.name,
    });
  }

  @Put(':discussionId/comments/:commentId')
  async updateComment(
    @Req() req: AuthenticatedRequest,
    @Param('discussionId', ParseIntPipe) discussionId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() body: { comment?: { message?: string; message_json?: any[] } },
  ) {
    return ResultGuard.throwIfNotFound(
      await this.discussionsService.updateComment(
        req.space.id,
        discussionId,
        commentId,
        body.comment ?? {},
      ),
    );
  }

  @Delete(':discussionId/comments/:commentId')
  @HttpCode(200)
  async deleteComment(
    @Req() req: AuthenticatedRequest,
    @Param('discussionId', ParseIntPipe) discussionId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    await this.discussionsService.deleteComment(req.space.id, discussionId, commentId);
    return {};
  }
}

/**
 * Mentioned discussions:
 *   GET /v1/spaces/:spaceId/mentioned_discussions/me
 */
@ApiTags('Discussions - MAPI')
@Controller('v1/spaces/:spaceId/mentioned_discussions')
@Auth('session-or-token')
export class MentionedDiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Get('me')
  async findMentioned(
    @Req() req: AuthenticatedRequest,
    @Query('per_page') perPage: string,
    @Query('page') page: string,
    @Query('by_status') byStatus: string,
  ) {
    const userId = req.adminUser?.sbxUserId;
    if (!userId) return { discussions: [] };
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(
      page,
      perPage,
    );
    return this.discussionsService.findMentionedDiscussions(
      req.space.id,
      userId,
      parsedPage,
      parsedPerPage,
      byStatus,
    );
  }
}
