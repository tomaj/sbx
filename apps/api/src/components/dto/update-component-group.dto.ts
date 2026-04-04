import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdateComponentGroupDataSchema = z.object({
  name: z.string().min(1).optional(),
  parent_id: z.number().int().nullable().optional(),
});

const UpdateComponentGroupSchema = z.object({
  component_group: UpdateComponentGroupDataSchema,
});

export class UpdateComponentGroupDto extends createZodDto(UpdateComponentGroupSchema) {}
