import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

// ─── MAPI asset update (wrapped in "asset" key) ─────────────────────────────

export class AssetDataDto {
  @IsString()
  @IsOptional()
  title?: string | null;

  @IsString()
  @IsOptional()
  alt?: string | null;

  @IsString()
  @IsOptional()
  copyright?: string | null;

  @IsString()
  @IsOptional()
  focus?: string | null;

  @IsString()
  @IsOptional()
  expire_at?: string | null;

  @IsBoolean()
  @IsOptional()
  locked?: boolean;

  @IsNumber()
  @IsOptional()
  asset_folder_id?: number | null;

  @IsBoolean()
  @IsOptional()
  is_private?: boolean;

  @IsObject()
  @IsOptional()
  meta_data?: Record<string, any>;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  internal_tag_ids?: number[];

  @IsString()
  @IsOptional()
  publish_at?: string | null;
}

export class UpdateAssetDto {
  @ValidateNested()
  @Type(() => AssetDataDto)
  @IsOptional()
  asset?: AssetDataDto;
}

// ─── Admin asset update (flat body, no wrapper) ──────────────────────────────

export class UpdateAssetAdminDto {
  @IsString()
  @IsOptional()
  title?: string | null;

  @IsString()
  @IsOptional()
  alt?: string | null;

  @IsString()
  @IsOptional()
  copyright?: string | null;

  @IsString()
  @IsOptional()
  focus?: string | null;

  @IsString()
  @IsOptional()
  expire_at?: string | null;

  @IsBoolean()
  @IsOptional()
  locked?: boolean;

  @IsNumber()
  @IsOptional()
  folder_id?: number | null;

  @IsObject()
  @IsOptional()
  meta_data?: Record<string, any>;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  internal_tag_ids?: number[];
}

// ─── Sign upload ─────────────────────────────────────────────────────────────

export class SignUploadDto {
  @IsString()
  filename!: string;

  @IsNumber()
  size!: number;

  @IsString()
  @IsOptional()
  content_type?: string;
}

// ─── Bulk operations ─────────────────────────────────────────────────────────

export class BulkUpdateDto {
  @IsNumber()
  asset_folder_id!: number;

  @IsArray()
  @IsNumber({}, { each: true })
  ids!: number[];
}

export class BulkIdsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  ids!: number[];
}

// ─── Asset folder ────────────────────────────────────────────────────────────

export class CreateAssetFolderDataDto {
  @IsString()
  name!: string;

  @IsNumber()
  @IsOptional()
  parent_id?: number | null;
}

export class CreateAssetFolderDto {
  @ValidateNested()
  @Type(() => CreateAssetFolderDataDto)
  asset_folder!: CreateAssetFolderDataDto;
}

export class UpdateAssetFolderDataDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  parent_id?: number | null;
}

export class UpdateAssetFolderDto {
  @ValidateNested()
  @Type(() => UpdateAssetFolderDataDto)
  asset_folder!: UpdateAssetFolderDataDto;
}
