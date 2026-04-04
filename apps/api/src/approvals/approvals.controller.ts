import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { ApprovalsService } from './approvals.service';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Approvals - MAPI')
@Controller('v1/spaces/:spaceId/approvals')
@Auth('session-or-token')
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
    return ResultGuard.throwIfNotFound(await this.approvalsService.findOne(req.space.id, parseInt(id)));
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
