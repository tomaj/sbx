import { Controller, Get, NotFoundException, Req, UseGuards } from '@nestjs/common';
import { TokenGuard } from '../auth/token.guard';
import { SpacesService } from './spaces.service';

@Controller('v2/cdn/spaces')
@UseGuards(TokenGuard)
export class SpacesCdnController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get('me')
  async getMe(@Req() req: any) {
    const result = await this.spacesService.getSpaceMe(req.space.id);
    if (!result) throw new NotFoundException();
    return result;
  }
}
