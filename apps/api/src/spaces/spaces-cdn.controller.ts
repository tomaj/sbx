import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { SpacesService } from './spaces.service';
import { ResultGuard } from '../shared/result-guard.util';

@ApiTags('Spaces - CDN')
@Controller('v2/cdn/spaces')
@Auth('token')
export class SpacesCdnController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    return ResultGuard.throwIfNotFound(await this.spacesService.getSpaceMe(req.space.id));
  }
}
