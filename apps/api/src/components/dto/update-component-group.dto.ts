import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class UpdateComponentGroupDataDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  parent_id?: number | null;
}

export class UpdateComponentGroupDto {
  @ValidateNested()
  @Type(() => UpdateComponentGroupDataDto)
  component_group!: UpdateComponentGroupDataDto;
}
