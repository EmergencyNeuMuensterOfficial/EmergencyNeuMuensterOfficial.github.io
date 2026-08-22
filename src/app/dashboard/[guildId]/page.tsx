'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const VERSION = 'v2';

/**
 * Legacy redirect: /dashboard/{guildId} → /dashboard/servers/{userId}/{guildId}/v2/
 *
 * Reads the logged-in user from /api/auth/me, then redirects.
 * Falls back to /dashboard if the user is not authenticated.
 */
export default function LegacyGuildRedirect() {
  const router = useRouter();
  const { guildId } = useParams<{ guildId: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as { authed?: boolean; user?: { id?: string } };
        if (cancelled) return;

        if (payload.authed && payload.user?.id) {
          router.replace(`/dashboard/servers/${payload.user.id}/${guildId}/${VERSION}`);
        } else {
          setError('You must be logged in to manage a server.');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to verify your session.');
      });

    return () => {
      cancelled = true;
    };
  }, [guildId, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-discord-darkest text-white">
        <div className="rounded-2xl border border-discord-gray/20 bg-discord-darker p-8 text-center">
          <p className="text-sm text-discord-red">{error}</p>
          <a
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-discord-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-discord-blue/80"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-discord-darkest text-white">
      <p className="text-sm text-discord-lightGray">Redirecting…</p>
    </div>
  );
}
