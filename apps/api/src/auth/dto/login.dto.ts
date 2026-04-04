import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Pattern: nestjs-zod DTO
 *
 * Define the schema with Zod — nestjs-zod generates:
 *   1. The DTO class (for NestJS DI, ValidationPipe, etc.)
 *   2. Swagger schema (auto-generated — no @ApiProperty() needed)
 *   3. Full TypeScript type inference
 *
 * Use ZodValidationPipe (global or per-controller) instead of ValidationPipe
 * when you want strict Zod validation rather than class-validator.
 */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class LoginDto extends createZodDto(LoginSchema) {}
