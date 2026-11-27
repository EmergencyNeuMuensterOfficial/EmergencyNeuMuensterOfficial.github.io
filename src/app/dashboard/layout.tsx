import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(COOKIE_NAME)?.value);

  if (session) return children;

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-lg items-center justify-center" aria-labelledby="dashboard-access-title">
      <div className="w-full rounded-3xl border border-discord-gray/30 bg-discord-darker p-8 text-center shadow-xl shadow-black/30">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-discord-blue/50 bg-discord-blue/15 text-2xl text-discord-white" aria-hidden>
          🔒
        </div>
        <h1 id="dashboard-access-title" className="mt-5 text-xl font-bold text-discord-white">
          Dashboard locked
        </h1>
        <p className="mt-2 text-sm leading-6 text-discord-lighterGray">
          Sign in with Discord to view and manage your OnboardX servers. Server settings remain hidden until your session is verified.
        </p>
        <a href="/api/auth/discord?next=%2Fdashboard" className="btn-primary mt-6 inline-flex">
          Log in with Discord
        </a>
      </div>
    </section>
  );
}
