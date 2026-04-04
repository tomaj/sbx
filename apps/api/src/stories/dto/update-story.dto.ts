import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdateStoryDataSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  tag_list: z.array(z.string()).optional(),
  path: z.string().nullable().optional(),
  sort_by_date: z.string().nullable().optional(),
  first_published_at: z.string().nullable().optional(),
  publish_at: z.string().nullable().optional(),
  expire_at: z.string().nullable().optional(),
  is_startpage: z.boolean().optional(),
  disable_fe_editor: z.boolean().optional(),
});

const UpdateStorySchema = z.object({
  story: UpdateStoryDataSchema,
  publish: z.boolean().optional(),
  force_update: z.string().optional(),
  release_id: z.number().int().optional(),
  group_id: z.string().optional(),
  lang: z.string().optional(),
});

export class UpdateStoryDto extends createZodDto(UpdateStorySchema) {}
