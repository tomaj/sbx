// Drizzle config lives in @sbx/db — run migrations from there:
//   cd packages/db && pnpm db:generate | pnpm db:migrate
//
// This file is kept so that drizzle-kit commands still work from apps/api
// for convenience (points to the same schema source via re-export).
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../../packages/db/src/schema.ts',
  out: '../../packages/db/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/sbx',
  },
});
