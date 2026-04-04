'use client';

import { logout } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await logout();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
    >
      Sign out
    </button>
  );
}
