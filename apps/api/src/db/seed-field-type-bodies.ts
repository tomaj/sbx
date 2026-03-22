/**
 * Fetches field type bodies from Storyblok and stores them in the DB.
 * Run: npx ts-node --transpile-only src/db/seed-field-type-bodies.ts
 */
import { Pool } from 'pg';

const MAPI_TOKEN = 'tN53d8vfG7VnXy596bgQZwtt-233927-7MxD9F_q4AHMddMv4p1y';
const FIELD_TYPE_IDS = [63561, 63906, 63907, 66648, 91837523215869];

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://tomaj@localhost:5432/sbx' });

async function main() {
  for (const id of FIELD_TYPE_IDS) {
    process.stdout.write(`Fetching body for #${id}... `);
    const res = await fetch(`https://mapi.storyblok.com/v1/field_types/${id}`, {
      headers: { Authorization: MAPI_TOKEN },
    });
    const data = await res.json() as any;
    const body = data.field_type?.body ?? '';
    const compiledBody = data.field_type?.compiled_body ?? '';

    await pool.query(
      'UPDATE field_types SET body = $1, compiled_body = $2 WHERE id = $3',
      [body, compiledBody, id],
    );
    console.log(`body=${body.length} chars, compiled=${compiledBody.length} chars`);
  }
  console.log('Done ✓');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
