import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { BranchesService } from './branches.service';

@Controller('v1/spaces/:spaceId/deployments')
@UseGuards(SessionOrTokenGuard)
export class DeploymentsController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(
    @Req() req: any,
    @Body() body: { branch_id: number; release_uuids?: string[] },
  ) {
    return this.branchesService.createDeployment(
      req.space.id,
      body.branch_id,
      body.release_uuids,
    );
  }
}
