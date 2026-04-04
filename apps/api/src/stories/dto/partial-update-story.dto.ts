import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, ValidateNested } from 'class-validator';

export class PartialUpdateStoryDataDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  favourite_for_user_ids?: number[];
}

export class PartialUpdateStoryDto {
  @ValidateNested()
  @Type(() => PartialUpdateStoryDataDto)
  @IsOptional()
  story?: PartialUpdateStoryDataDto;
}
