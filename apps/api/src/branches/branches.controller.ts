import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { BranchesService } from './branches.service';
import { BaseCrudController } from '../shared/base-crud.controller';
import { ResultGuard } from '../shared/result-guard.util';
import { BaseCrudService } from '../shared/base-crud.service';

@ApiTags('Branches - MAPI')
@Controller('v1/spaces/:spaceId/branches')
@Auth('session-or-token')
export class BranchesController extends BaseCrudController<unknown> {
  constructor(private readonly branchesService: BranchesService) {
    super();
  }

  protected get service(): BaseCrudService<unknown> {
    // BranchesService is not a BaseCrudService subclass but has compatible findOne/remove signatures
    return this.branchesService as unknown as BaseCrudService<unknown>;
  }

  protected async doList(spaceId: number, query: Record<string, string>): Promise<unknown> {
    return this.branchesService.findAll(spaceId, { by_ids: query.by_ids, search: query.search });
  }

  protected async doCreate(spaceId: number, body: any): Promise<unknown> {
    return this.branchesService.create(spaceId, {
      name: body.branch.name,
      url: body.branch.url,
      position: body.branch.position,
      source_id: body.branch.source_id,
    });
  }

  protected async doUpdate(spaceId: number, id: number, body: any): Promise<unknown> {
    return ResultGuard.throwIfNotFound(
      await this.branchesService.update(spaceId, id, {
        name: body.branch.name,
        url: body.branch.url,
        position: body.branch.position,
        source_id: body.branch.source_id,
      }),
    );
  }
}
