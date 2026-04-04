import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ComponentGroupDataDto {
  @IsString()
  name!: string;

  @IsNumber()
  @IsOptional()
  parent_id?: number | null;

  @IsString()
  @IsOptional()
  parent_uuid?: string | null;
}

export class CreateComponentGroupDto {
  @ValidateNested()
  @Type(() => ComponentGroupDataDto)
  component_group!: ComponentGroupDataDto;
}
