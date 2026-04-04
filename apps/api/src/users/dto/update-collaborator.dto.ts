import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdateCollaboratorDataSchema = z.object({
  role: z.string().optional(),
  space_role_id: z.number().int().nullable().optional(),
  space_role_ids: z.array(z.number().int()).optional(),
});

const UpdateCollaboratorSchema = z.object({
  collaborator: UpdateCollaboratorDataSchema.optional(),
});

export class UpdateCollaboratorDto extends createZodDto(UpdateCollaboratorSchema) {}
