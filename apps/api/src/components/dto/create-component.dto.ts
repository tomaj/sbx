import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ComponentDataSchema = z.object({
  name: z.string().min(1),
  display_name: z.string().nullable().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  is_root: z.boolean().optional(),
  is_nestable: z.boolean().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  component_group_uuid: z.string().nullable().optional(),
});

const CreateComponentSchema = z.object({
  component: ComponentDataSchema,
});

export class CreateComponentDto extends createZodDto(CreateComponentSchema) {}
