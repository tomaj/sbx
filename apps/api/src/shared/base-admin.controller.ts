import { QueryParserUtil } from './query-parser.util';

/**
 * Abstract base class for admin controllers.
 *
 * Provides shared helpers so controllers don't import QueryParserUtil directly
 * and repeat the same `parsePagination` call pattern everywhere.
 *
 * Usage:
 *   @ApiTags('Foo - Admin')
 *   @Controller('v1/admin/spaces/:spaceId/foos')
 *   @Auth('session')
 *   export class FooAdminController extends BaseAdminController {
 *     ...
 *     @Get()
 *     list(@Query('page') page = '1', @Query('per_page') perPage = '25') {
 *       const { page: p, perPage: pp } = this.parsePagination(page, perPage);
 *       return this.fooService.findAll(p, pp);
 *     }
 *   }
 */
export abstract class BaseAdminController {
  /**
   * Parse `page` and `per_page` query params into integers with sane defaults.
   * Delegates to QueryParserUtil so subclasses don't need to import it.
   */
  protected parsePagination(page: string = '1', perPage: string = '25') {
    return QueryParserUtil.parsePagination(page, perPage);
  }
}
