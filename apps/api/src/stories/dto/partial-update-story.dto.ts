import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const PartialUpdateStoryDataSchema = z.object({
  favourite_for_user_ids: z.array(z.number().int()).optional(),
});

const PartialUpdateStorySchema = z.object({
  story: PartialUpdateStoryDataSchema.optional(),
});

export class PartialUpdateStoryDto extends createZodDto(PartialUpdateStorySchema) {}
