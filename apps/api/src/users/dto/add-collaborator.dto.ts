import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CollaboratorDataSchema = z.object({
  user_id: z.number().int().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  space_role_id: z.number().int().nullable().optional(),
});

// Storyblok accepts both root-level fields and wrapped in "collaborator" key
const AddCollaboratorSchema = z
  .object({
    collaborator: CollaboratorDataSchema.optional(),
    user_id: z.number().int().optional(),
    email: z.string().email().optional(),
    role: z.string().optional(),
    space_role_id: z.number().int().nullable().optional(),
  })
  .refine((d) => d.collaborator || d.user_id || d.email, {
    message: 'Must provide collaborator, user_id, or email',
  });

export class AddCollaboratorDto extends createZodDto(AddCollaboratorSchema) {}
