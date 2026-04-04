import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { QueryParserUtil } from '../shared/query-parser.util';

@Controller('v1/admin/spaces/:spaceId/assets')
@Auth('session')
export class AssetsAdminController {
  constructor(private readonly assetsService: AssetsService) {}

  // ─── Counts ─────────────────────────────────────────────────────────────────

  @Get('counts')
  counts(@Param('spaceId') spaceId: string) {
    return this.assetsService.getTotalCount(parseInt(spaceId));
  }

  // ─── Folders ─────────────────────────────────────────────────────────────────

  @Get('folders')
  listFolders(@Param('spaceId') spaceId: string) {
    return this.assetsService.listFolders(parseInt(spaceId));
  }

  @Post('folders')
  createFolder(
    @Param('spaceId') spaceId: string,
    @Body() body: { name: string; parent_id?: number | null },
  ) {
    return this.assetsService.createFolder(parseInt(spaceId), body);
  }

  @Patch('folders/:folderId')
  updateFolder(
    @Param('spaceId') spaceId: string,
    @Param('folderId') folderId: string,
    @Body() body: { name?: string; parent_id?: number | null },
  ) {
    return this.assetsService.updateFolder(parseInt(folderId), parseInt(spaceId), body);
  }

  @Delete('folders/:folderId')
  deleteFolder(
    @Param('spaceId') spaceId: string,
    @Param('folderId') folderId: string,
  ) {
    return this.assetsService.deleteFolder(parseInt(folderId), parseInt(spaceId));
  }

  // ─── Assets ─────────────────────────────────────────────────────────────────

  @Get()
  list(
    @Param('spaceId') spaceId: string,
    @Query('page') page = '1',
    @Query('per_page') perPage = '24',
    @Query('search') search?: string,
    @Query('folder_id') folderId?: string,
    @Query('sort_field') sortField?: string,
    @Query('sort_dir') sortDir?: string,
    @Query('deleted') deleted?: string,
    @Query('content_type') contentType?: string,
  ) {
    const { page: parsedPage, perPage: parsedPerPage } = QueryParserUtil.parsePagination(page, perPage);
    return this.assetsService.listAssets(parseInt(spaceId), {
      page: parsedPage,
      perPage: parsedPerPage,
      search,
      folderId: folderId === 'null' ? null : folderId ? parseInt(folderId) : undefined,
      sortField,
      sortDir: sortDir === 'asc' ? 'asc' : 'desc',
      deleted: deleted === 'true',
      contentType,
    });
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 50, { limits: { fileSize: 100 * 1024 * 1024 } }))
  upload(
    @Param('spaceId') spaceId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder_id') folderId?: string,
  ) {
    const parsedFolderId = folderId && folderId !== 'null' ? parseInt(folderId) : null;
    return this.assetsService.uploadAssets(parseInt(spaceId), files ?? [], parsedFolderId);
  }

  @Get(':assetId')
  getOne(
    @Param('spaceId') spaceId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.assetsService.getAsset(parseInt(assetId), parseInt(spaceId));
  }

  @Patch(':assetId')
  update(
    @Param('spaceId') spaceId: string,
    @Param('assetId') assetId: string,
    @Body() body: UpdateAssetAdminDto,
  ) {
    return this.assetsService.updateAsset(parseInt(assetId), parseInt(spaceId), body);
  }

  @Post(':assetId/replace')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  replace(
    @Param('spaceId') spaceId: string,
    @Param('assetId') assetId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.assetsService.replaceAsset(parseInt(assetId), parseInt(spaceId), file);
  }

  @Delete(':assetId')
  softDelete(
    @Param('spaceId') spaceId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.assetsService.softDeleteAsset(parseInt(assetId), parseInt(spaceId));
  }

  @Post(':assetId/restore')
  restore(
    @Param('spaceId') spaceId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.assetsService.restoreAsset(parseInt(assetId), parseInt(spaceId));
  }

  @Post(':assetId/ai/alt-text')
  generateAltText(
    @Param('spaceId') spaceId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.assetsService.generateAltText(parseInt(assetId), parseInt(spaceId));
  }

}
