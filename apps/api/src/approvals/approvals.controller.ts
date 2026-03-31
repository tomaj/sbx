import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { ApprovalsService } from './approvals.service';

@Controller('v1/spaces/:spaceId/approvals')
@UseGuards(SessionOrTokenGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  async getApprovals(
    @Req() req: any,
    @Query('approver') approver?: string,
    @Query('with_story') withStory?: string,
  ) {
    const approverId = approver ? parseInt(approver) : undefined;
    return this.approvalsService.findAll(req.space.id, approverId, withStory === 'true');
  }

  @Get(':id')
  async getApproval(@Req() req: any, @Param('id') id: string) {
    const result = await this.approvalsService.findOne(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post()
  @HttpCode(201)
  async createApproval(
    @Req() req: any,
    @Body() body: { approval: { approver_id: number; story_id: number }; release_id?: number },
  ) {
    return this.approvalsService.create(req.space.id, body.approval, body.release_id);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteApproval(@Req() req: any, @Param('id') id: string) {
    await this.approvalsService.remove(req.space.id, parseInt(id));
  }
}
