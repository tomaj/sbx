/**
 * Creates an admin user directly in the database.
 * Requires a running PostgreSQL instance with DATABASE_URL configured.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret \
 *   npx tsx tools/create-admin.ts
 */
import { Pool } from 'pg';
import * as argon2 from 'argon2';

const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const password = process.env.ADMIN_PASSWORD ?? 'changeme123';
const name = process.env.ADMIN_NAME ?? 'Admin';
const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/sbx';

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });

  const passwordHash = await argon2.hash(password);

  const [firstname, ...rest] = name.split(' ');
  const lastname = rest.join(' ');

  const result = await pool.query(
    `INSERT INTO users (uuid, email, password_hash, firstname, lastname, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, firstname = EXCLUDED.firstname, lastname = EXCLUDED.lastname
     RETURNING id, email, firstname, lastname`,
    [email, passwordHash, firstname, lastname],
  );

  const user = result.rows[0];
  console.log(`Admin user ready: [${user.id}] ${user.email} (${user.firstname} ${user.lastname})`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
