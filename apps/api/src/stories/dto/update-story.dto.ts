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

export class UpdateStoryDataDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tag_list?: string[];

  @IsString()
  @IsOptional()
  path?: string | null;

  @IsString()
  @IsOptional()
  sort_by_date?: string | null;

  @IsString()
  @IsOptional()
  first_published_at?: string | null;

  @IsString()
  @IsOptional()
  publish_at?: string | null;

  @IsString()
  @IsOptional()
  expire_at?: string | null;

  @IsBoolean()
  @IsOptional()
  is_startpage?: boolean;

  @IsBoolean()
  @IsOptional()
  disable_fe_editor?: boolean;
}

export class UpdateStoryDto {
  @ValidateNested()
  @Type(() => UpdateStoryDataDto)
  story!: UpdateStoryDataDto;

  @IsBoolean()
  @IsOptional()
  publish?: boolean;

  @IsString()
  @IsOptional()
  force_update?: string;

  @IsNumber()
  @IsOptional()
  release_id?: number;

  @IsString()
  @IsOptional()
  group_id?: string;

  @IsString()
  @IsOptional()
  lang?: string;
}
