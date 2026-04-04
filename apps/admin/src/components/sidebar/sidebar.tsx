import { UserMenu } from './user-menu';
import { NavLinks } from './nav-links';
import { getServerSession } from '@/lib/api-server';

export async function Sidebar() {
  const session = await getServerSession();

  return (
    <aside className="w-[220px] shrink-0 bg-[#1b2539] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/10">
        <div className="size-8 rounded bg-[#e20074] flex items-center justify-center text-white font-bold text-sm">
          S
        </div>
        <span className="ml-2.5 text-white font-semibold text-sm">SBX</span>
      </div>

      {/* Nav + bottom items */}
      <NavLinks />

      {/* User menu */}
      <div className="px-2 pb-2">
        <UserMenu name={session?.name ?? ''} email={session?.email ?? ''} />
      </div>
    </aside>
  );
}
