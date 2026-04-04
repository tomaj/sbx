import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ─── MAPI asset update (wrapped in "asset" key) ─────────────────────────────

const AssetDataSchema = z.object({
  title: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
  copyright: z.string().nullable().optional(),
  focus: z.string().nullable().optional(),
  expire_at: z.string().nullable().optional(),
  locked: z.boolean().optional(),
  asset_folder_id: z.number().int().nullable().optional(),
  is_private: z.boolean().optional(),
  meta_data: z.record(z.string(), z.unknown()).optional(),
  internal_tag_ids: z.array(z.number().int()).optional(),
  publish_at: z.string().nullable().optional(),
});

const UpdateAssetSchema = z.object({
  asset: AssetDataSchema.optional(),
});

export class UpdateAssetDto extends createZodDto(UpdateAssetSchema) {}

// ─── Admin asset update (flat body, no wrapper) ──────────────────────────────

const UpdateAssetAdminSchema = z.object({
  title: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
  copyright: z.string().nullable().optional(),
  focus: z.string().nullable().optional(),
  expire_at: z.string().nullable().optional(),
  locked: z.boolean().optional(),
  folder_id: z.number().int().nullable().optional(),
  meta_data: z.record(z.string(), z.unknown()).optional(),
  internal_tag_ids: z.array(z.number().int()).optional(),
});

export class UpdateAssetAdminDto extends createZodDto(UpdateAssetAdminSchema) {}

// ─── Sign upload ─────────────────────────────────────────────────────────────

const SignUploadSchema = z.object({
  filename: z.string().min(1),
  size: z.number().int().positive(),
  content_type: z.string().optional(),
});

export class SignUploadDto extends createZodDto(SignUploadSchema) {}

// ─── Bulk operations ─────────────────────────────────────────────────────────

const BulkUpdateSchema = z.object({
  asset_folder_id: z.number().int(),
  ids: z.array(z.number().int()),
});

export class BulkUpdateDto extends createZodDto(BulkUpdateSchema) {}

const BulkIdsSchema = z.object({
  ids: z.array(z.number().int()),
});

export class BulkIdsDto extends createZodDto(BulkIdsSchema) {}

// ─── Asset folder ────────────────────────────────────────────────────────────

const CreateAssetFolderDataSchema = z.object({
  name: z.string().min(1),
  parent_id: z.number().int().nullable().optional(),
});

const CreateAssetFolderSchema = z.object({
  asset_folder: CreateAssetFolderDataSchema,
});

export class CreateAssetFolderDto extends createZodDto(CreateAssetFolderSchema) {}

const UpdateAssetFolderDataSchema = z.object({
  name: z.string().min(1).optional(),
  parent_id: z.number().int().nullable().optional(),
});

const UpdateAssetFolderSchema = z.object({
  asset_folder: UpdateAssetFolderDataSchema,
});

export class UpdateAssetFolderDto extends createZodDto(UpdateAssetFolderSchema) {}
