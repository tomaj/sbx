import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class UpdateCollaboratorDataDto {
  @IsString()
  @IsOptional()
  role?: string;

  @IsNumber()
  @IsOptional()
  space_role_id?: number | null;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  space_role_ids?: number[];
}

export class UpdateCollaboratorDto {
  @ValidateNested()
  @Type(() => UpdateCollaboratorDataDto)
  @IsOptional()
  collaborator?: UpdateCollaboratorDataDto;
}
