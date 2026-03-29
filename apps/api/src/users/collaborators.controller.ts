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
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionOrTokenGuard } from '../auth/session-or-token.guard';
import { UsersService } from './users.service';

// MAPI endpoint - uses same token guard (management token)
@Controller('v1/spaces/:spaceId/collaborators')
@UseGuards(SessionOrTokenGuard)
export class CollaboratorsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getCollaborators(@Req() req: any) {
    return this.usersService.getCollaborators(req.space.id);
  }

  @Get(':id')
  async getCollaborator(@Req() req: any, @Param('id') id: string) {
    const result = await this.usersService.getCollaboratorById(req.space.id, parseInt(id));
    if (!result) throw new NotFoundException();
    return result;
  }

  @Post()
  @HttpCode(201)
  async addCollaborator(@Req() req: any, @Body() body: { collaborator: any }) {
    const data = body.collaborator ?? {};
    const spaceId: number = req.space.id;

    // Resolve user_id: accept either user_id or email
    let userId: number | undefined = data.user_id;
    if (!userId && data.email) {
      const found = await this.usersService.findUserByEmail(data.email);
      if (!found) throw new NotFoundException(`User with email ${data.email} not found`);
      userId = found.id;
    }
    if (!userId) throw new NotFoundException('user_id or email is required');

    const role: string = data.role ?? 'editor';
    const spaceRoleId: number | null = data.space_role_id ?? null;

    await this.usersService.addSpaceMember(spaceId, userId, role, spaceRoleId);

    const result = await this.usersService.getCollaboratorByUserId(spaceId, userId);
    return result;
  }

  @Put(':id')
  async updateCollaborator(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { collaborator: any },
  ) {
    const data = body.collaborator ?? {};
    const memberId = parseInt(id);
    const spaceId: number = req.space.id;

    const existing = await this.usersService.getCollaboratorById(spaceId, memberId);
    if (!existing) throw new NotFoundException();

    await this.usersService.updateSpaceMember(spaceId, memberId, {
      role: data.role,
      spaceRoleId: data.space_role_id,
      spaceRoleIds: data.space_role_ids,
    });

    const result = await this.usersService.getCollaboratorById(spaceId, memberId);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Delete(':id')
  @HttpCode(200)
  async removeCollaborator(@Req() req: any, @Param('id') id: string) {
    const memberId = parseInt(id);
    const spaceId: number = req.space.id;

    const existing = await this.usersService.getCollaboratorById(spaceId, memberId);
    if (!existing) throw new NotFoundException();

    await this.usersService.removeSpaceMember(spaceId, memberId);
    return {};
  }
}
