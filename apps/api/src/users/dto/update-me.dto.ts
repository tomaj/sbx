import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateMeDto {
  @IsString()
  @IsOptional()
  firstname?: string;

  @IsString()
  @IsOptional()
  lastname?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  favourite_spaces?: number[];
}
