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
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { ApprovalsService } from './approvals.service';
import { ResultGuard } from '../shared/result-guard.util';
import { QueryParserUtil } from '../shared/query-parser.util';

@ApiTags('Approvals - MAPI')
@Controller('v1/spaces/:spaceId/approvals')
@Auth('session-or-token')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  async getApprovals(
    @Req() req: AuthenticatedRequest,
    @Query('approver') approver?: string,
    @Query('with_story') withStory?: string,
  ) {
    const approverId = QueryParserUtil.parseOptionalInt(approver);
    return this.approvalsService.findAll(req.space.id, approverId, withStory === 'true');
  }

  @Get(':id')
  async getApproval(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(await this.approvalsService.findOne(req.space.id, id));
  }

  @Post()
  @HttpCode(201)
  async createApproval(
    @Req() req: AuthenticatedRequest,
    @Body() body: { approval: { approver_id: number; story_id: number }; release_id?: number },
  ) {
    return this.approvalsService.create(req.space.id, body.approval, body.release_id);
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteApproval(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    await this.approvalsService.remove(req.space.id, id);
    return {};
  }
}
