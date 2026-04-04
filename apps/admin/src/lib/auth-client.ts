export async function login(
  email: string,
  password: string,
): Promise<{ user: Record<string, unknown> }> {
  const res = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? 'Invalid email or password');
  }
  return data as { user: Record<string, unknown> };
}

export async function logout(): Promise<void> {
  await fetch('/api/admin/auth/logout', { method: 'POST' });
}
