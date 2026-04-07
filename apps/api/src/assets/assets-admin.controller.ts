import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Auth } from '../auth/auth.decorator';
import { AssetsService } from './assets.service';
import { UpdateAssetAdminDto } from './dto/update-asset.dto';
import { BaseAdminController } from '../shared/base-admin.controller';
import { QueryParserUtil } from '../shared/query-parser.util';
import { assetMulterOptions, validateFileMagicBytes } from './asset-upload.utils';

@Controller('v1/admin/spaces/:spaceId/assets')
@Auth('session')
export class AssetsAdminController extends BaseAdminController {
  constructor(private readonly assetsService: AssetsService) {
    super();
  }

  // ─── Counts ─────────────────────────────────────────────────────────────────

  @Get('counts')
  counts(@Param('spaceId', ParseIntPipe) spaceId: number) {
    return this.assetsService.getTotalCount(spaceId);
  }

  // ─── Folders ─────────────────────────────────────────────────────────────────

  @Get('folders')
  listFolders(@Param('spaceId', ParseIntPipe) spaceId: number) {
    return this.assetsService.listFolders(spaceId);
  }

  @Post('folders')
  createFolder(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Body() body: { name: string; parent_id?: number | null },
  ) {
    return this.assetsService.createFolder(spaceId, body);
  }

  @Patch('folders/:folderId')
  updateFolder(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('folderId', ParseIntPipe) folderId: number,
    @Body() body: { name?: string; parent_id?: number | null },
  ) {
    return this.assetsService.updateFolder(folderId, spaceId, body);
  }

  @Delete('folders/:folderId')
  deleteFolder(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('folderId', ParseIntPipe) folderId: number,
  ) {
    return this.assetsService.deleteFolder(folderId, spaceId);
  }

  // ─── Assets ─────────────────────────────────────────────────────────────────

  @Get()
  list(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Query('page') page = '1',
    @Query('per_page') perPage = '24',
    @Query('search') search?: string,
    @Query('folder_id') folderId?: string,
    @Query('sort_field') sortField?: string,
    @Query('sort_dir') sortDir?: string,
    @Query('deleted') deleted?: string,
    @Query('content_type') contentType?: string,
  ) {
    const { page: parsedPage, perPage: parsedPerPage } = this.parsePagination(page, perPage);
    return this.assetsService.listAssets(spaceId, {
      page: parsedPage,
      perPage: parsedPerPage,
      search,
      folderId: folderId === 'null' ? null : QueryParserUtil.parseOptionalInt(folderId),
      sortField,
      sortDir: sortDir === 'asc' ? 'asc' : 'desc',
      deleted: deleted === 'true',
      contentType,
    });
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 50, assetMulterOptions))
  async upload(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder_id') folderId?: string,
  ) {
    await validateFileMagicBytes(files ?? []);
    const parsedFolderId =
      folderId && folderId !== 'null' ? (QueryParserUtil.parseOptionalInt(folderId) ?? null) : null;
    return this.assetsService.uploadAssets(spaceId, files ?? [], parsedFolderId);
  }

  @Get(':assetId')
  getOne(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('assetId', ParseIntPipe) assetId: number,
  ) {
    return this.assetsService.getAsset(assetId, spaceId);
  }

  @Patch(':assetId')
  update(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('assetId', ParseIntPipe) assetId: number,
    @Body() body: UpdateAssetAdminDto,
  ) {
    return this.assetsService.updateAsset(assetId, spaceId, body);
  }

  @Post(':assetId/replace')
  @UseInterceptors(FileInterceptor('file', assetMulterOptions))
  replace(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('assetId', ParseIntPipe) assetId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.assetsService.replaceAsset(assetId, spaceId, file);
  }

  @Delete(':assetId')
  softDelete(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('assetId', ParseIntPipe) assetId: number,
  ) {
    return this.assetsService.softDeleteAsset(assetId, spaceId);
  }

  @Post(':assetId/restore')
  restore(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('assetId', ParseIntPipe) assetId: number,
  ) {
    return this.assetsService.restoreAsset(assetId, spaceId);
  }

  @Post(':assetId/ai/alt-text')
  generateAltText(
    @Param('spaceId', ParseIntPipe) spaceId: number,
    @Param('assetId', ParseIntPipe) assetId: number,
  ) {
    return this.assetsService.generateAltText(assetId, spaceId);
  }
}
