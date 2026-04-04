import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdateMeSchema = z.object({
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  favourite_spaces: z.array(z.number().int()).optional(),
});

export class UpdateMeDto extends createZodDto(UpdateMeSchema) {}
