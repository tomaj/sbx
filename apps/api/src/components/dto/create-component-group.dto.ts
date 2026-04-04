import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ComponentGroupDataSchema = z.object({
  name: z.string().min(1),
  parent_id: z.number().int().nullable().optional(),
  parent_uuid: z.string().nullable().optional(),
});

const CreateComponentGroupSchema = z.object({
  component_group: ComponentGroupDataSchema,
});

export class CreateComponentGroupDto extends createZodDto(CreateComponentGroupSchema) {}
