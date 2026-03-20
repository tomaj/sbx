/**
 * Creates an admin user via better-auth sign-up endpoint.
 * Run this after starting the admin app (pnpm --filter admin dev).
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret \
 *   npx ts-node --transpile-only tools/create-admin.ts
 */

const email = process.env.ADMIN_EMAIL ?? 'admin@example.com'
const password = process.env.ADMIN_PASSWORD ?? 'changeme123'
const name = process.env.ADMIN_NAME ?? 'Admin'
const baseUrl = process.env.ADMIN_URL ?? 'http://localhost:3001'

async function main() {
  const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('Failed to create user:', data)
    process.exit(1)
  }

  console.log(`Created admin user: ${email}`)
}

main().catch(console.error)
