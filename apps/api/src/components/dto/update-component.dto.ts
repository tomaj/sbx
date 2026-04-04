import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class UpdateComponentDataDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  display_name?: string | null;

  @IsObject()
  @IsOptional()
  schema?: any;

  @IsBoolean()
  @IsOptional()
  is_root?: boolean;

  @IsBoolean()
  @IsOptional()
  is_nestable?: boolean;

  @IsString()
  @IsOptional()
  color?: string | null;

  @IsString()
  @IsOptional()
  icon?: string | null;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsOptional()
  component_group_uuid?: string | null;
}

export class UpdateComponentDto {
  @ValidateNested()
  @Type(() => UpdateComponentDataDto)
  component!: UpdateComponentDataDto;
}
