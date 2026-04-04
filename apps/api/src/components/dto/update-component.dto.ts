import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdateComponentDataSchema = z.object({
  name: z.string().min(1).optional(),
  display_name: z.string().nullable().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  is_root: z.boolean().optional(),
  is_nestable: z.boolean().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  preview_field: z.string().nullable().optional(),
  preview_tmpl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  component_group_uuid: z.string().nullable().optional(),
  internal_tags_list: z.array(z.object({ id: z.number().int(), name: z.string() })).optional(),
  internal_tag_ids: z.array(z.string()).optional(),
});

const UpdateComponentSchema = z.object({
  component: UpdateComponentDataSchema,
});

export class UpdateComponentDto extends createZodDto(UpdateComponentSchema) {}
