import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
// NotFoundException kept for the email lookup error below
import { Auth } from '../auth/auth.decorator';
import { UsersService } from './users.service';
import { AddCollaboratorDto } from './dto/add-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { QueryParserUtil } from '../shared/query-parser.util';
import { ResultGuard } from '../shared/result-guard.util';

// MAPI endpoint - uses same token guard (management token)
@Controller('v1/spaces/:spaceId/collaborators')
@Auth('session-or-token')
export class CollaboratorsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getCollaborators(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(
      page,
      perPage,
    );
    return this.usersService.getCollaborators(req.space.id, {
      page: parsedPage,
      perPage: parsedPerPage,
    });
  }

  @Post()
  @HttpCode(201)
  async addCollaborator(@Req() req: AuthenticatedRequest, @Body() body: AddCollaboratorDto) {
    // Accept both root-level fields (standard) and wrapped in "collaborator" (SSO)
    const data = body.collaborator ?? body;
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
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCollaboratorDto,
  ) {
    const data = body.collaborator ?? {};
    const memberId = id;
    const spaceId: number = req.space.id;

    ResultGuard.throwIfNotFound(await this.usersService.getCollaboratorById(spaceId, memberId));

    await this.usersService.updateSpaceMember(spaceId, memberId, {
      role: data.role,
      spaceRoleId: data.space_role_id,
      spaceRoleIds: data.space_role_ids,
    });

    const result = ResultGuard.throwIfNotFound(
      await this.usersService.getCollaboratorById(spaceId, memberId),
    );
    return result;
  }

  @Delete(':id')
  @HttpCode(200)
  async removeCollaborator(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const memberId = id;
    const spaceId: number = req.space.id;

    ResultGuard.throwIfNotFound(await this.usersService.getCollaboratorById(spaceId, memberId));

    await this.usersService.removeSpaceMember(spaceId, memberId);
    return {};
  }
}
