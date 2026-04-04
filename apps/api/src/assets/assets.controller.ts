import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Auth } from '../auth/auth.decorator';
import { AssetsService } from './assets.service';
import {
  UpdateAssetDto,
  SignUploadDto,
  BulkUpdateDto,
  BulkIdsDto,
  CreateAssetFolderDto,
  UpdateAssetFolderDto,
} from './dto/update-asset.dto';
import { QueryParserUtil } from '../shared/query-parser.util';

@Controller('v1/spaces/:spaceId')
@Auth('session-or-token')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ─── Asset Folders ───────────────────────────────────────────────────────────

  @Get('asset_folders')
  async listFolders(
    @Param('spaceId') spaceId: string,
    @Query('by_ids') byIds?: string,
    @Query('search') search?: string,
    @Query('with_parent') withParent?: string,
  ) {
    return this.assetsService.listFolders(parseInt(spaceId), {
      byIds: QueryParserUtil.parseCsvToInts(byIds),
      search,
      withParent: withParent !== undefined ? parseInt(withParent) : undefined,
    });
  }

  @Get('asset_folders/:id')
  async getFolder(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
  ) {
    const folder = await this.assetsService.findFolder(parseInt(id), parseInt(spaceId));
    return { asset_folder: folder };
  }

  @Post('asset_folders')
  async createFolder(
    @Param('spaceId') spaceId: string,
    @Body() body: CreateAssetFolderDto,
  ) {
    const folder = await this.assetsService.createFolder(parseInt(spaceId), body.asset_folder);
    return { asset_folder: folder };
  }

  @Put('asset_folders/:id')
  async updateFolder(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: UpdateAssetFolderDto,
  ) {
    const folder = await this.assetsService.updateFolder(parseInt(id), parseInt(spaceId), body.asset_folder);
    return { asset_folder: folder };
  }

  @Delete('asset_folders/:id')
  @HttpCode(HttpStatus.OK)
  async deleteFolder(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
  ) {
    await this.assetsService.deleteFolder(parseInt(id), parseInt(spaceId));
    return {};
  }

  // ─── Assets ─────────────────────────────────────────────────────────────────

  @Get('assets')
  async listAssets(
    @Param('spaceId') spaceId: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '25',
    @Query('search') search?: string,
    @Query('in_folder') inFolder?: string,
    @Query('content_type') contentType?: string,
    @Query('sort_by') sortBy?: string,
    @Query('is_private') isPrivate?: string,
    @Query('by_alt') byAlt?: string,
    @Query('by_copyright') byCopyright?: string,
    @Query('by_title') byTitle?: string,
    @Query('with_tags') withTags?: string,
  ) {
    // sort_by format: "created_at:desc" or "short_filename:asc"
    let sortField: string | undefined;
    let sortDir: 'asc' | 'desc' | undefined;
    if (sortBy) {
      const parsed = QueryParserUtil.parseSortBy(sortBy);
      sortField = parsed.field;
      sortDir = parsed.dir;
    }

    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(page, perPage);
    const result = await this.assetsService.listAssets(parseInt(spaceId), {
      page: parsedPage,
      perPage: parsedPerPage,
      search,
      folderId: inFolder !== undefined && inFolder !== '-1' ? (inFolder === 'null' ? null : parseInt(inFolder)) : undefined,
      deleted: inFolder === '-1',
      contentType,
      sortField,
      sortDir,
      isPrivate: isPrivate === '1',
      byAlt,
      byCopyright,
      byTitle,
      withTags,
    });
    return { assets: result.assets, total: result.total };
  }

  @Post('assets')
  async signUpload(
    @Param('spaceId') spaceId: string,
    @Body() body: SignUploadDto,
  ) {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const safeName = (body.filename ?? 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
    const prettyUrl = `/f/${spaceId}/${id}-${safeName}`;
    return {
      id,
      fields: {},
      post_url: `/v1/admin/spaces/${spaceId}/assets/upload`,
      pretty_url: prettyUrl,
      public_url: prettyUrl,
      signed_request: '',
    };
  }

  @Get('assets/:id')
  async getAsset(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
  ) {
    const asset = await this.assetsService.getAsset(parseInt(id), parseInt(spaceId));
    return { asset };
  }

  @Put('assets/:id')
  async updateAsset(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body() body: UpdateAssetDto,
  ) {
    const data = body.asset ?? {};
    const asset = await this.assetsService.updateAsset(parseInt(id), parseInt(spaceId), {
      title: data.title,
      alt: data.alt,
      copyright: data.copyright,
      focus: data.focus,
      expire_at: data.expire_at,
      locked: data.locked,
      folder_id: data.asset_folder_id,
      meta_data: data.meta_data,
      internal_tag_ids: data.internal_tag_ids,
    });
    return { asset };
  }

  @Delete('assets/:id')
  @HttpCode(HttpStatus.OK)
  async deleteAsset(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
  ) {
    const asset = await this.assetsService.softDeleteAsset(parseInt(id), parseInt(spaceId));
    return { asset };
  }

  @Post('assets/:id/restore')
  async restoreAsset(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
  ) {
    const asset = await this.assetsService.restoreAsset(parseInt(id), parseInt(spaceId));
    return { asset };
  }

  // ─── Bulk Operations ────────────────────────────────────────────────────────

  @Post('assets/bulk_update')
  @HttpCode(HttpStatus.OK)
  async bulkUpdate(
    @Param('spaceId') spaceId: string,
    @Body() body: BulkUpdateDto,
  ) {
    await this.assetsService.bulkUpdate(parseInt(spaceId), body.ids, body.asset_folder_id);
    return {};
  }

  @Post('assets/bulk_destroy')
  @HttpCode(HttpStatus.OK)
  async bulkDestroy(
    @Param('spaceId') spaceId: string,
    @Body() body: BulkIdsDto,
  ) {
    await this.assetsService.bulkDestroy(parseInt(spaceId), body.ids);
    return {};
  }

  @Post('assets/bulk_restore')
  @HttpCode(HttpStatus.OK)
  async bulkRestore(
    @Param('spaceId') spaceId: string,
    @Body() body: BulkIdsDto,
  ) {
    await this.assetsService.bulkRestore(parseInt(spaceId), body.ids);
    return {};
  }
}
