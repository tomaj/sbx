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

export class StoryDataDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  parent_id?: number | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tag_list?: string[];

  @IsString()
  @IsOptional()
  path?: string | null;

  @IsBoolean()
  @IsOptional()
  is_folder?: boolean;

  @IsBoolean()
  @IsOptional()
  is_startpage?: boolean;

  @IsString()
  @IsOptional()
  first_published_at?: string | null;

  @IsString()
  @IsOptional()
  publish_at?: string | null;

  @IsString()
  @IsOptional()
  expire_at?: string | null;
}

export class CreateStoryDto {
  @ValidateNested()
  @Type(() => StoryDataDto)
  story!: StoryDataDto;

  @IsBoolean()
  @IsOptional()
  publish?: boolean;

  @IsNumber()
  @IsOptional()
  release_id?: number;
}
