import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { UsersService } from './users.service';

// MAPI endpoint - uses same token guard (management token)
@Controller('v1/spaces/:spaceId/collaborators')
@UseGuards(TokenGuard)
export class CollaboratorsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getCollaborators(@Req() req: any) {
    return this.usersService.getCollaborators(req.space.id);
  }
}
