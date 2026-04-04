import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { DiscussionsService } from './discussions.service';
import { ResultGuard } from '../shared/result-guard.util';

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
    @Req() req: any,
    @Param('storyId') storyId: string,
    @Query('per_page') perPage: string,
    @Query('page') page: string,
    @Query('by_status') byStatus: string,
  ) {
    return this.discussionsService.listByStory(
      req.space.id,
      parseInt(storyId),
      page ? parseInt(page) : 1,
      perPage ? parseInt(perPage) : 25,
      byStatus,
    );
  }

  @Post()
  @HttpCode(201)
  async create(
    @Req() req: any,
    @Param('storyId') storyId: string,
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
    return this.discussionsService.createDiscussion(
      req.space.id,
      parseInt(storyId),
      body.discussion ?? {},
      req.adminUser,
    );
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
    @Req() req: any,
    @Param('discussionId') discussionId: string,
  ) {
    return { discussion: ResultGuard.throwIfNotFound(
      await this.discussionsService.getDiscussion(req.space.id, parseInt(discussionId)),
    ) };
  }

  @Put(':discussionId')
  async update(
    @Req() req: any,
    @Param('discussionId') discussionId: string,
    @Body() body: { discussion?: { solved_at?: string | null } },
  ) {
    return { discussion: ResultGuard.throwIfNotFound(
      await this.discussionsService.updateDiscussion(
        req.space.id,
        parseInt(discussionId),
        body.discussion ?? {},
      ),
    ) };
  }

  @Delete(':discussionId')
  @HttpCode(204)
  async remove(
    @Req() req: any,
    @Param('discussionId') discussionId: string,
  ) {
    await this.discussionsService.deleteDiscussion(
      req.space.id,
      parseInt(discussionId),
    );
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
    @Req() req: any,
    @Param('discussionId') discussionId: string,
  ) {
    return this.discussionsService.listComments(req.space.id, discussionId);
  }

  @Post(':discussionId/comments')
  @HttpCode(201)
  async createComment(
    @Req() req: any,
    @Param('discussionId') discussionId: string,
    @Body() body: { comment?: { message?: string; message_json?: any[] } },
  ) {
    return this.discussionsService.createComment(
      req.space.id,
      parseInt(discussionId),
      {
        ...body.comment,
        user_email: req.adminUser?.email,
        user_name: req.adminUser?.name,
      },
    );
  }

  @Put(':discussionId/comments/:commentId')
  async updateComment(
    @Req() req: any,
    @Param('discussionId') discussionId: string,
    @Param('commentId') commentId: string,
    @Body() body: { comment?: { message?: string; message_json?: any[] } },
  ) {
    return ResultGuard.throwIfNotFound(
      await this.discussionsService.updateComment(
        req.space.id,
        parseInt(discussionId),
        parseInt(commentId),
        body.comment ?? {},
      ),
    );
  }

  @Delete(':discussionId/comments/:commentId')
  @HttpCode(204)
  async deleteComment(
    @Req() req: any,
    @Param('discussionId') discussionId: string,
    @Param('commentId') commentId: string,
  ) {
    await this.discussionsService.deleteComment(
      req.space.id,
      parseInt(discussionId),
      parseInt(commentId),
    );
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
    @Req() req: any,
    @Query('per_page') perPage: string,
    @Query('page') page: string,
    @Query('by_status') byStatus: string,
  ) {
    const userId = req.adminUser?.id;
    if (!userId) return { discussions: [] };
    return this.discussionsService.findMentionedDiscussions(
      req.space.id,
      userId,
      page ? parseInt(page) : 1,
      perPage ? parseInt(perPage) : 25,
      byStatus,
    );
  }
}
