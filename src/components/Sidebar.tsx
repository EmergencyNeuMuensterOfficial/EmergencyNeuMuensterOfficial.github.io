'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiHeaders } from '../lib/clientApi';

interface AccessInfo {
  loggedIn: boolean;
  allowed: boolean;
}

const BASE_NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/status', label: 'Status' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [adminAccess, setAdminAccess] = useState<boolean | null>(null);

  const checkAdminAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/access', { cache: 'no-store', headers: apiHeaders() });
      const payload = (await response.json()) as AccessInfo;
      setAdminAccess(payload.allowed);
    } catch {
      setAdminAccess(false);
    }
  }, []);

  useEffect(() => {
    void checkAdminAccess();
  }, [checkAdminAccess]);

  const navItems = adminAccess ? [...BASE_NAV_ITEMS, { href: '/admin', label: 'Admin' }] : BASE_NAV_ITEMS;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 animate-fade-in-up flex-col border-r border-discord-gray/20 bg-discord-darker">
      <Link
        href="/"
        className="group flex items-center gap-3 border-b border-discord-gray/20 px-5 py-4 transition-colors hover:bg-discord-gray/10"
      >
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg transition-transform duration-300 group-hover:scale-110">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon" alt="OnboardX" className="h-9 w-9 object-contain" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-discord-white">OnboardX</p>
          <p className="text-xs text-discord-lightGray">Dashboard</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item, index) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ animationDelay: `${index * 60}ms` }}
              className={`group flex animate-fade-in-up items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ${
                active
                  ? 'bg-discord-blue/15 text-discord-blue ring-1 ring-inset ring-discord-blue/40'
                  : 'text-discord-lighterGray hover:translate-x-1 hover:bg-discord-gray/30 hover:text-discord-white'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full transition-transform duration-300 group-hover:scale-125 ${
                  active ? 'bg-discord-blue' : 'bg-discord-lightGray'
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-discord-gray/20 px-5 py-4 animate-fade-in-up">
        <p className="text-xs text-discord-lightGray">© {new Date().getFullYear()} OnboardX</p>
        <a
          href="/status"
          className="mt-1 block text-xs text-discord-blue transition-all duration-300 hover:translate-x-0.5 hover:underline"
        >
          Live status
        </a>
      </div>
    </aside>
  );
}