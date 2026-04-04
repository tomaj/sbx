import { Controller, Delete, HttpCode, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { PresetsService } from './presets.service';
import { BaseCrudController } from '../shared/base-crud.controller';
import { ResultGuard } from '../shared/result-guard.util';
import { BaseCrudService } from '../shared/base-crud.service';
import { QueryParserUtil } from '../shared/query-parser.util';
import { AuthenticatedRequest } from '../auth/authenticated-request.interface';

@ApiTags('Presets - MAPI')
@Controller('v1/spaces/:spaceId/presets')
@Auth('session-or-token')
export class PresetsController extends BaseCrudController<unknown> {
  constructor(private readonly presetsService: PresetsService) {
    super();
  }

  protected get service(): BaseCrudService<unknown> {
    // PresetsService is not a BaseCrudService subclass but has compatible findOne/remove signatures
    return this.presetsService as unknown as BaseCrudService<unknown>;
  }

  protected async doList(spaceId: number, query: Record<string, string>): Promise<unknown> {
    return this.presetsService.findAll(
      spaceId,
      QueryParserUtil.parseOptionalInt(query.component_id),
    );
  }

  protected async doCreate(spaceId: number, body: any): Promise<unknown> {
    return this.presetsService.create(spaceId, body.preset);
  }

  protected async doUpdate(spaceId: number, id: number, body: any): Promise<unknown> {
    return ResultGuard.throwIfNotFound(await this.presetsService.update(spaceId, id, body.preset));
  }

  // Presets delete returns 200 with the deleted preset (not 204 empty)
  @Delete(':id')
  @HttpCode(200)
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(await this.presetsService.remove(req.space.id, id));
  }
}
