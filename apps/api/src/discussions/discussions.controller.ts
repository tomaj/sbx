import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { DiscussionsService } from './discussions.service';

@Controller('v1/spaces/:spaceId/discussions')
@UseGuards(SessionOrTokenGuard)
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Get('mentions')
  async findMentions(
    @Req() req: any,
    @Query('user_name') userName: string,
    @Query('page') page: string,
    @Query('per_page') perPage: string,
  ) {
    if (!userName) return { comments: [], total: 0 };
    return this.discussionsService.findMentions(
      req.space.id,
      userName,
      page ? parseInt(page) : 1,
      perPage ? parseInt(perPage) : 10,
    );
  }

  @Get()
  async listByStory(
    @Req() req: any,
    @Query('story_id') storyId: string,
    @Query('resolved') resolved: string,
  ) {
    if (!storyId) return { discussions: [] };
    return this.discussionsService.listByStory(
      req.space.id,
      parseInt(storyId),
      resolved === 'true',
    );
  }

  @Post()
  @HttpCode(201)
  async createDiscussion(
    @Req() req: any,
    @Body() body: { discussion?: { story_id?: number; field_key?: string } },
  ) {
    const discussion = await this.discussionsService.createDiscussion(
      req.space.id,
      body.discussion?.story_id,
      body.discussion?.field_key,
    );
    return { discussion };
  }

  @Post('field')
  @HttpCode(200)
  async getOrCreateFieldDiscussion(
    @Req() req: any,
    @Body() body: { story_id: number; field_key: string },
  ) {
    return this.discussionsService.getOrCreateDiscussionForField(
      req.space.id,
      body.story_id,
      body.field_key,
    );
  }

  @Put(':discussionId/resolve')
  async resolveDiscussion(@Req() req: any, @Param('discussionId') discussionId: string) {
    const result = await this.discussionsService.resolveDiscussion(
      req.space.id,
      parseInt(discussionId),
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Put(':discussionId/unresolve')
  async unresolveDiscussion(@Req() req: any, @Param('discussionId') discussionId: string) {
    const result = await this.discussionsService.unresolveDiscussion(
      req.space.id,
      parseInt(discussionId),
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Get(':discussionId/comments')
  async listComments(@Req() req: any, @Param('discussionId') discussionId: string) {
    return this.discussionsService.listComments(req.space.id, parseInt(discussionId));
  }

  @Get(':discussionId/comments/:commentId')
  async getComment(
    @Req() req: any,
    @Param('discussionId') discussionId: string,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.discussionsService.getComment(
      req.space.id,
      parseInt(discussionId),
      parseInt(commentId),
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post(':discussionId/comments')
  @HttpCode(201)
  async createComment(
    @Req() req: any,
    @Param('discussionId') discussionId: string,
    @Body() body: { comment?: { message?: string; message_json?: any[] } },
  ) {
    return this.discussionsService.createComment(req.space.id, parseInt(discussionId), {
      ...body.comment,
      user_email: req.adminUser?.email,
      user_name: req.adminUser?.name,
    });
  }

  @Put(':discussionId/comments/:commentId')
  async updateComment(
    @Req() req: any,
    @Param('discussionId') discussionId: string,
    @Param('commentId') commentId: string,
    @Body() body: { comment?: { message?: string; message_json?: any[] } },
  ) {
    const result = await this.discussionsService.updateComment(
      req.space.id,
      parseInt(discussionId),
      parseInt(commentId),
      body.comment ?? {},
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':discussionId/comments/:commentId')
  @HttpCode(200)
  async deleteComment(
    @Req() req: any,
    @Param('discussionId') discussionId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.discussionsService.deleteComment(
      req.space.id,
      parseInt(discussionId),
      parseInt(commentId),
    );
  }
}
