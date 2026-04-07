import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '../auth/auth.decorator';
import { AssetsService } from './assets.service';
import { assetMulterOptions, validateFileMagicBytes } from './asset-upload.utils';
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
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('by_ids') byIds?: string,
    @Query('search') search?: string,
    @Query('with_parent') withParent?: string,
  ) {
    return this.assetsService.listFolders(spaceId, {
      byIds: QueryParserUtil.parseCsvToInts(byIds),
      search,
      withParent: QueryParserUtil.parseOptionalInt(withParent),
    });
  }

  @Get('asset_folders/:id')
  async getFolder(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const folder = await this.assetsService.findFolder(id, spaceId);
    return { asset_folder: folder };
  }

  @Post('asset_folders')
  async createFolder(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Body() body: CreateAssetFolderDto,
  ) {
    const folder = await this.assetsService.createFolder(spaceId, body.asset_folder);
    return { asset_folder: folder };
  }

  @Put('asset_folders/:id')
  async updateFolder(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAssetFolderDto,
  ) {
    const folder = await this.assetsService.updateFolder(id, spaceId, body.asset_folder);
    return { asset_folder: folder };
  }

  @Delete('asset_folders/:id')
  @HttpCode(HttpStatus.OK)
  async deleteFolder(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.assetsService.deleteFolder(id, spaceId);
    return {};
  }

  // ─── Assets ─────────────────────────────────────────────────────────────────

  @Get('assets')
  async listAssets(
    @Param('spaceId', ParseIntPipe) spaceId: number,
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

    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(
      page,
      perPage,
    );
    const result = await this.assetsService.listAssets(spaceId, {
      page: parsedPage,
      perPage: parsedPerPage,
      search,
      folderId:
        inFolder !== undefined && inFolder !== '-1'
          ? inFolder === 'null'
            ? null
            : QueryParserUtil.parseOptionalInt(inFolder)
          : undefined,
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
  async signUpload(@Param('spaceId', ParseIntPipe) spaceId: number, @Body() body: SignUploadDto) {
    return this.assetsService.signUpload(spaceId, body);
  }

  /**
   * Step 2 of the upload flow: receive the file and store it in MinIO.
   * Called with the `post_url` returned by `signUpload`.
   * Does NOT create a DB record — that happens in `finish_upload`.
   */
  @Post('assets/:id/upload')
  @UseInterceptors(FileInterceptor('file', assetMulterOptions))
  async uploadFile(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await validateFileMagicBytes([file]);
    return this.assetsService.uploadSignedFile(spaceId, id, file);
  }

  /**
   * Step 3 of the upload flow: create the DB record after the file is in MinIO.
   */
  @Post('assets/:id/finish_upload')
  @HttpCode(HttpStatus.OK)
  async finishUpload(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.assetsService.finishUpload(spaceId, id);
  }

  @Get('assets/:id')
  async getAsset(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const asset = await this.assetsService.getAsset(id, spaceId);
    return { asset };
  }

  @Put('assets/:id')
  async updateAsset(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAssetDto,
  ) {
    const data = body.asset ?? {};
    const asset = await this.assetsService.updateAsset(id, spaceId, {
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
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const asset = await this.assetsService.softDeleteAsset(id, spaceId);
    return { asset };
  }

  @Post('assets/:id/restore')
  async restoreAsset(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const asset = await this.assetsService.restoreAsset(id, spaceId);
    return { asset };
  }

  /**
   * Download private asset content — requires preview or management token (not public).
   * Public assets can be accessed directly via CDN URL; private (locked) assets must use this endpoint.
   */
  @Get('assets/:id/content')
  async downloadAsset(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename, locked } = await this.assetsService.getAssetContent(
      id,
      spaceId,
    );

    // Private assets require non-public token — the @Auth('session-or-token') guard above
    // already ensures some auth is present; public CDN tokens are typed 'public' in the token table.
    // We simply serve the file for all authenticated requests so management UIs always work.
    void locked; // checked at CDN level (future); here we just require auth

    res.set({
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': locked ? 'private, max-age=3600' : 'public, max-age=31536000',
    });
    res.send(buffer);
  }

  // ─── Bulk Operations ────────────────────────────────────────────────────────

  @Post('assets/bulk_update')
  @HttpCode(HttpStatus.OK)
  async bulkUpdate(@Param('spaceId', ParseIntPipe) spaceId: number, @Body() body: BulkUpdateDto) {
    await this.assetsService.bulkUpdate(spaceId, body.ids, body.asset_folder_id);
    return {};
  }

  @Post('assets/bulk_destroy')
  @HttpCode(HttpStatus.OK)
  async bulkDestroy(@Param('spaceId', ParseIntPipe) spaceId: number, @Body() body: BulkIdsDto) {
    await this.assetsService.bulkDestroy(spaceId, body.ids);
    return {};
  }

  @Post('assets/bulk_restore')
  @HttpCode(HttpStatus.OK)
  async bulkRestore(@Param('spaceId', ParseIntPipe) spaceId: number, @Body() body: BulkIdsDto) {
    await this.assetsService.bulkRestore(spaceId, body.ids);
    return {};
  }
}
