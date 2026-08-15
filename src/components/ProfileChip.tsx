'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface MeUser {
  id: string;
  username: string;
  avatar: string | null;
}

interface MeResponse {
  authed: boolean;
  user: MeUser | null;
}

function avatarUrl(user: MeUser): string {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  }
  return 'https://cdn.discordapp.com/embed/avatars/0.png';
}

export function ProfileChip() {
  const [me, setMe] = useState<MeResponse | null>(null);

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
    <div className="fixed bottom-4 right-4 z-50">
      {me === null ? (
        <div className="flex items-center gap-3 rounded-xl border border-discord-gray/30 bg-discord-dark/80 px-3 py-2 shadow-xl">
          <span className="h-8 w-8 animate-pulse rounded-full bg-discord-gray" />
          <span className="h-3 w-20 animate-pulse rounded bg-discord-gray/70" />
        </div>
      ) : me.authed && me.user ? (
        <div className="flex items-center gap-3 rounded-xl border border-discord-gray/30 bg-discord-dark/95 px-3 py-2 shadow-xl backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(me.user)}
            alt=""
            className="h-8 w-8 rounded-full"
          />
          <div className="min-w-0">
            <p className="max-w-[10rem] truncate text-sm font-semibold text-discord-white">
              {me.user.username}
            </p>
            <form action="/api/auth/logout" method="post" className="mt-0.5">
              <button
                type="submit"
                className="text-xs text-discord-lightGray transition hover:text-discord-red"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      ) : (
        <Link
          href="/api/auth/discord"
          className="inline-flex items-center gap-2 rounded-xl bg-discord-blue px-4 py-2.5 text-sm font-semibold text-white shadow-xl transition hover:bg-discord-blue/80"
        >
          <span className="h-4 w-4 rounded-full bg-white/30" />
          Log in with Discord
        </Link>
      )}
    </div>
  );
}