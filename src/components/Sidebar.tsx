'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/status', label: 'Status' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-discord-gray/20 bg-discord-darker">
      <Link href="/" className="flex items-center gap-3 border-b border-discord-gray/20 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-discord-blue font-bold">
          OX
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-discord-white">OnboardX</p>
          <p className="text-xs text-discord-lightGray">Dashboard</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-discord-blue/15 text-discord-blue ring-1 ring-inset ring-discord-blue/40'
                  : 'text-discord-lighterGray hover:bg-discord-gray/30 hover:text-discord-white'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${active ? 'bg-discord-blue' : 'bg-discord-lightGray'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-discord-gray/20 px-5 py-4">
        <p className="text-xs text-discord-lightGray">© {new Date().getFullYear()} OnboardX</p>
        <a
          href="/status"
          className="mt-1 block text-xs text-discord-blue transition hover:underline"
        >
          Live status
        </a>
      </div>
    </aside>
  );
}