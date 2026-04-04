/**
 * Fetches field type bodies from Storyblok and stores them in the DB.
 * Run: npx ts-node --transpile-only src/db/seed-field-type-bodies.ts
 */
import { Pool } from 'pg';

const MAPI_TOKEN = process.env.STORYBLOK_MAPI_TOKEN;
if (!MAPI_TOKEN) {
  console.error('Missing STORYBLOK_MAPI_TOKEN env variable');
  process.exit(1);
}
const FIELD_TYPE_IDS = [63561, 63906, 63907, 66648, 91837523215869];

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL env variable');
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  for (const id of FIELD_TYPE_IDS) {
    process.stdout.write(`Fetching body for #${id}... `);
    const res = await fetch(`https://mapi.storyblok.com/v1/field_types/${id}`, {
      headers: { Authorization: MAPI_TOKEN! },
    });
    const data = (await res.json()) as any;
    const body = data.field_type?.body ?? '';
    const compiledBody = data.field_type?.compiled_body ?? '';

    await pool.query('UPDATE field_types SET body = $1, compiled_body = $2 WHERE id = $3', [
      body,
      compiledBody,
      id,
    ]);
    console.log(`body=${body.length} chars, compiled=${compiledBody.length} chars`);
  }
  console.log('Done ✓');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
