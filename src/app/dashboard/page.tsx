'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { Reveal } from '../../components/Reveal';

interface GuildCard {
  id: string;
  name: string;
  iconUrl: string | null;
  owner: boolean;
}

interface GuildsResponse {
  data?: {
    user?: { id: string; username: string; avatar: string | null };
    guilds?: GuildCard[];
    missingBotToken?: boolean;
  };
  error?: string;
  code?: string;
}

const LOGIN_ERRORS: Record<string, string> = {
  error: 'Something went wrong while logging in. Please try again.',
  invalid: 'The login link was invalid or expired. Please try again.',
  missing_scope: 'Permission was denied. Please allow the requested permissions.',
  no_admin: 'You need to be a server owner or administrator to use the dashboard.',
};

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const loginError = searchParams.get('login');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GuildsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/guilds', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as GuildsResponse;
        if (response.status === 401) {
          if (!cancelled) setData(null); // stay on the login card
          return;
        }
        if (!response.ok) throw new Error(payload.error || 'Failed to load servers');
        if (!cancelled) setData(payload);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Failed to load servers');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-discord-darkest text-white">
      <Sidebar />
      <div className="ml-60">
        <div className="border-b border-discord-gray/20 bg-discord-darker/80 px-6 py-4 animate-fade-in-up">
          <h1 className="text-sm font-bold leading-tight">Dashboard</h1>
          <p className="text-xs text-discord-lightGray">Manage your servers</p>
        </div>

        <main className="mx-auto max-w-4xl px-6 py-10">
          {loginError && LOGIN_ERRORS[loginError] && (
            <Reveal>
            <p className="mb-6 rounded-lg border border-discord-red/40 bg-discord-red/10 px-4 py-3 text-sm text-discord-red animate-fade-in-up">
              {LOGIN_ERRORS[loginError]}
            </p>
            </Reveal>
          )}

          {loading && <p className="text-sm text-discord-lightGray">Checking your Discord session…</p>}

          {!loading && !data && !error && (
            <Reveal>
            <div className="mx-auto max-w-md rounded-2xl border border-discord-gray/20 bg-discord-darker p-8 text-center animate-fade-in-up">
              <p className="text-lg font-semibold">Log in with Discord</p>
              <p className="mt-2 text-sm text-discord-lightGray">
                You must be a server owner or administrator of a server where OnboardX is present to manage it.
              </p>
              <a
                href="/api/auth/discord"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-discord-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-discord-blue/80"
              >
                Login with Discord
              </a>
            </div>
            </Reveal>
          )}

          {error && (
            <Reveal>
            <div className="mx-auto max-w-md rounded-2xl border border-discord-red/40 bg-discord-red/10 p-8 text-center animate-fade-in-up">
              <p className="text-sm text-discord-red">{error}</p>
              {error.includes('expired') ? (
                <a
                  href="/api/auth/discord"
                  className="mt-4 inline-block rounded-lg bg-discord-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-discord-blue/80"
                >
                  Log in again
                </a>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 inline-block rounded-lg border border-discord-gray/40 px-5 py-2 text-sm font-semibold text-discord-lighterGray transition hover:bg-discord-gray/40"
                >
                  Retry
                </button>
              )}
            </div>
            </Reveal>
          )}

          {data && (
            <>
              <div className="mb-6 flex items-center justify-between animate-fade-in-up">
                <div>
                  <h2 className="text-lg font-bold">Your servers</h2>
                  <p className="mt-1 text-sm text-discord-lightGray">
                    Servers where you have admin rights and OnboardX is present.
                  </p>
                </div>
                {data.data?.user && (
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className="rounded-lg border border-discord-gray/40 px-3 py-1.5 text-xs font-semibold text-discord-lighterGray transition hover:bg-discord-gray/40"
                    >
                      Log out
                    </button>
                  </form>
                )}
              </div>

              {data.data?.missingBotToken && (
                <p className="mb-6 rounded-lg border border-discord-yellow/40 bg-discord-yellow/10 px-4 py-3 text-sm text-discord-yellow">
                  Bot presence could not be verified (DISCORD_TOKEN not configured), so all your admin servers are shown.
                </p>
              )}

              {data.data?.guilds && data.data.guilds.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.data.guilds.map((guild, index) => (
                    <Reveal key={guild.id} delay={(index % 3) * 80}>
                    <Link
                      href={`/dashboard/${guild.id}`}
                      className="group flex animate-fade-in-up items-center gap-3 rounded-2xl border border-discord-gray/20 bg-discord-darker p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-discord-blue/50 hover:bg-discord-dark hover:shadow-lg hover:shadow-discord-blue/10"
                    >
                      {guild.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={guild.iconUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-discord-gray text-base font-bold">
                          {guild.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-discord-white">{guild.name}</p>
                        <p className="text-xs text-discord-lightGray">
                          {guild.owner ? 'Owner' : 'Administrator'} · Manage
                        </p>
                      </div>
                    </Link>
                    </Reveal>
                  ))}
                </div>
              ) : (
                <Reveal>
                <div className="rounded-2xl border border-discord-gray/20 bg-discord-darker px-6 py-10 text-center animate-fade-in-up">
                  <p className="text-sm text-discord-lightGray">
                    No manageable servers found. OnboardX is not in any of your servers.
                  </p>
                  <a
                    href={process.env.NEXT_PUBLIC_BOT_INVITE_URL || '#'}
                    className="mt-4 inline-block rounded-lg bg-discord-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-discord-blue/80"
                  >
                    Add OnboardX to a server
                  </a>
                </div>
                </Reveal>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}