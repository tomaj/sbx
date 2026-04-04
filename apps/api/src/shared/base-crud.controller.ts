import { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import {
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ResultGuard } from './result-guard.util';
import { BaseCrudService } from './base-crud.service';

/**
 * Abstract base controller for space-scoped CRUD resources.
 *
 * Provides list / get / delete endpoints automatically.
 * Subclasses must implement `service`, `doCreate`, and `doUpdate`.
 *
 * Example:
 *
 *   @ApiTags('Presets - MAPI')
 *   @Controller('v1/spaces/:spaceId/presets')
 *   @Auth('session-or-token')
 *   export class PresetsController extends BaseCrudController<FormattedPreset> {
 *     constructor(private readonly presetsService: PresetsService) { super() }
 *
 *     protected get service() { return this.presetsService }
 *
 *     protected async doCreate(spaceId: number, body: any) {
 *       return this.presetsService.create(spaceId, body.preset)
 *     }
 *     protected async doUpdate(spaceId: number, id: number, body: any) {
 *       return ResultGuard.throwIfNotFound(
 *         await this.presetsService.update(spaceId, id, body.preset)
 *       )
 *     }
 *   }
 *
 * Only extend this for controllers with standard CRUD and no extra endpoints.
 */
export abstract class BaseCrudController<TFormatted> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract get service(): BaseCrudService<TFormatted>;

  protected abstract doCreate(spaceId: number, body: any): Promise<unknown>;
  protected abstract doUpdate(spaceId: number, id: number, body: any): Promise<unknown>;

  @Get()
  async list(@Req() req: AuthenticatedRequest, @Query() query: Record<string, string>) {
    return this.doList(req.space.id, query);
  }

  protected async doList(spaceId: number, _query: Record<string, string>): Promise<unknown> {
    return this.service.findAll(spaceId);
  }

  @Get(':id')
  async get(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return ResultGuard.throwIfNotFound(await this.service.findOne(req.space.id, id));
  }

  @Post()
  @HttpCode(201)
  async create(@Req() req: AuthenticatedRequest, @Body() body: any) {
    return this.doCreate(req.space.id, body);
  }

  @Put(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.doUpdate(req.space.id, id, body);
  }

  @Delete(':id')
  @HttpCode(200)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any> {
    ResultGuard.throwIfNotFound(await this.service.remove(req.space.id, id));
    return {};
  }
}
