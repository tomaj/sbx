import { IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddCollaboratorDataDto {
  @IsNumber()
  @IsOptional()
  user_id?: number;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsNumber()
  @IsOptional()
  space_role_id?: number | null;
}

export class AddCollaboratorDto {
  // Storyblok accepts both root-level fields and wrapped in "collaborator"
  // We validate the wrapper; controller unwraps it
  @IsOptional()
  collaborator?: AddCollaboratorDataDto;

  // Also allow root-level fields for backward compat
  @IsNumber()
  @IsOptional()
  user_id?: number;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsNumber()
  @IsOptional()
  space_role_id?: number | null;
}
