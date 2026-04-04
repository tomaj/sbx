import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const StoryDataSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  content: z.record(z.string(), z.unknown()).optional(),
  parent_id: z.number().int().nullable().optional(),
  tag_list: z.array(z.string()).optional(),
  path: z.string().nullable().optional(),
  is_folder: z.boolean().optional(),
  is_startpage: z.boolean().optional(),
  first_published_at: z.string().nullable().optional(),
  publish_at: z.string().nullable().optional(),
  expire_at: z.string().nullable().optional(),
});

const CreateStorySchema = z.object({
  story: StoryDataSchema,
  publish: z.boolean().optional(),
  release_id: z.number().int().optional(),
});

export class CreateStoryDto extends createZodDto(CreateStorySchema) {}
