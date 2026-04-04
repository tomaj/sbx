import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { BranchesService } from './branches.service';

@ApiTags('Deployments - MAPI')
@Controller('v1/spaces/:spaceId/deployments')
@Auth('session-or-token')
export class DeploymentsController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { branch_id: number; release_uuids?: string[] },
  ) {
    return this.branchesService.createDeployment(req.space.id, body.branch_id, body.release_uuids);
  }
}
