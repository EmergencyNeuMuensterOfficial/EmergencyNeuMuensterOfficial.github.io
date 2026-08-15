'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface MeUser {
  id: string;
  username: string;
  avatar: string | null;
  globalName: string | null;
  discriminator: string;
  banner: string | null;
  accentColor: number | null;
}

interface MeResponse {
  authed: boolean;
  user: MeUser | null;
}

function avatarUrl(user: MeUser, size = 128): string {
  if (user.avatar) {
    if (user.avatar.startsWith('a_')) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.gif?size=${size}`;
    }
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
  }
  const n = Number(user.discriminator || '0') % 5 || 0;
  return `https://cdn.discordapp.com/embed/avatars/${n}.png`;
}

function bannerUrl(user: MeUser): string | null {
  if (user.banner) {
    if (user.banner.startsWith('a_')) {
      return `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.gif?size=480`;
    }
    return `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.png?size=480`;
  }
  return null;
}

function hexToCss(hexColor: number | null): string | null {
  if (hexColor == null) return null;
  return `#${(hexColor >>> 0).toString(16).padStart(6, '0')}`;
}

export function ProfileChip() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      const payload = (await response.json()) as MeResponse;
      setMe(payload);
    } catch {
      setMe({ authed: false, user: null });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {me === null ? (
        <div className="flex items-center gap-3 rounded-xl border border-discord-gray/30 bg-discord-dark/80 px-3 py-2 shadow-xl">
          <span className="h-8 w-8 animate-pulse rounded-full bg-discord-gray" />
          <span className="h-3 w-20 animate-pulse rounded bg-discord-gray/70" />
        </div>
      ) : me.authed && me.user ? (
        <>
          {open && (
            <div className="mb-3 w-80 overflow-hidden rounded-2xl border border-discord-gray/40 bg-discord-darker shadow-2xl">
              <div className="h-20" style={{ background: bannerUrl(me.user) ? undefined : hexToCss(me.user.accentColor) ?? '#5865F2' }} />
              {bannerUrl(me.user) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerUrl(me.user)!} alt="" className="h-20 w-full object-cover" />
              )}
              <div className="-mt-8 px-4 pb-4">
                <div className="flex items-end gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl(me.user)}
                    alt=""
                    className="h-16 w-16 rounded-full border-4 border-discord-darker bg-discord-darker"
                  />
                  <div className="min-w-0 pb-0.5">
                    <p className="truncate text-sm font-bold text-discord-white">
                      {me.user.globalName || me.user.username}
                    </p>
                    <p className="text-xs text-discord-lightGray">@{me.user.username}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-discord-lighterGray transition hover:bg-discord-gray/30 hover:text-discord-white"
                  >
                    My dashboard
                  </Link>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-discord-lighterGray transition hover:bg-discord-gray/30 hover:text-discord-white"
                  >
                    Admin panel
                  </Link>
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-discord-red transition hover:bg-discord-red/10"
                    >
                      Log out
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex items-center gap-3 rounded-xl border border-discord-gray/40 bg-discord-dark/95 py-2 pl-2 pr-3 shadow-xl backdrop-blur transition hover:border-discord-blue/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(me.user, 64)}
              alt=""
              className="h-9 w-9 rounded-full ring-2 ring-discord-blue/60"
            />
            <div className="min-w-0 text-left">
              <p className="max-w-[9rem] truncate text-sm font-semibold text-discord-white">
                {me.user.globalName || me.user.username}
              </p>
              <p className="flex items-center gap-1 text-xs text-discord-lightGray">
                <span className="h-2 w-2 rounded-full bg-discord-green" />
                {me.user.username}
              </p>
            </div>
            <span className={`text-xs text-discord-lightGray transition-transform ${open ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
        </>
      ) : (
        <Link
          href="/api/auth/discord"
          className="inline-flex items-center gap-2 rounded-xl bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white shadow-xl transition hover:brightness-110"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          Log in with Discord
        </Link>
      )}
    </div>
  );
}