import { Sidebar } from '../components/Sidebar';

export default function HomePage() {
  return (
    <div className="bg-discord-darkest text-discord-white">
      <Sidebar />
      <div className="ml-60 min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-discord-blue text-2xl font-black shadow-lg shadow-discord-blue/30">
            OB
          </div>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">OnboardX</h1>
          <p className="mt-3 max-w-xl text-lg text-discord-lighterGray">
            A Discord bot that helps server owners onboard new members with a smooth, automated welcome experience.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/status"
              className="rounded-lg bg-discord-blue px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-discord-blue/80"
            >
              View System Status
            </a>
            <a
              href="#features"
              className="rounded-lg border border-discord-gray bg-discord-dark px-6 py-3 text-sm font-semibold text-discord-white transition-colors hover:bg-discord-gray/50"
            >
              Learn More
            </a>
          </div>

          <div className="mt-14 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6 text-left">
              <p className="text-2xl font-bold text-discord-blue">96%</p>
              <p className="mt-1 text-sm text-discord-lighterGray">of members complete onboarding</p>
            </div>
            <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6 text-left">
              <p className="text-2xl font-bold text-discord-blue">3K+</p>
              <p className="mt-1 text-sm text-discord-lighterGray">servers onboarded</p>
            </div>
            <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6 text-left">
              <p className="text-2xl font-bold text-discord-blue">24/7</p>
              <p className="mt-1 text-sm text-discord-lighterGray">automated moderation cover</p>
            </div>
          </div>

          <section id="features" className="mt-16 w-full">
            <h2 className="text-center text-2xl font-bold">Features</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6">
                <p className="flex items-center gap-2.5 font-semibold text-discord-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-discord-blue" />
                  Automated Onboarding
                </p>
                <p className="mt-2 text-sm text-discord-lighterGray">
                  Custom welcome messages, verification steps and auto-roles get new members set up in minutes — no manual work.
                </p>
              </div>
              <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6">
                <p className="flex items-center gap-2.5 font-semibold text-discord-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-discord-red" />
                  Verification &amp; Security
                </p>
                <p className="mt-2 text-sm text-discord-lighterGray">
                  Math or image captcha verification, anti-spam, honeypots and security profiles keep raids and bots out.
                </p>
              </div>
              <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6">
                <p className="flex items-center gap-2.5 font-semibold text-discord-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-discord-yellow" />
                  Moderation Suite
                </p>
                <p className="mt-2 text-sm text-discord-lighterGray">
                  Warns, timeouts, purging, bans and full moderation case history with optional log channels.
                </p>
              </div>
              <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6">
                <p className="flex items-center gap-2.5 font-semibold text-discord-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-discord-green" />
                  Leveling &amp; XP
                </p>
                <p className="mt-2 text-sm text-discord-lighterGray">
                  XP rewards, rank cards, leaderboards and automatic level roles keep your community engaged.
                </p>
              </div>
              <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6">
                <p className="flex items-center gap-2.5 font-semibold text-discord-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-discord-purple" />
                  Giveaways, Polls &amp; Events
                </p>
                <p className="mt-2 text-sm text-discord-lighterGray">
                  Run giveaways, polls and RSVP events to keep activity flowing inside your server.
                </p>
              </div>
              <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6">
                <p className="flex items-center gap-2.5 font-semibold text-discord-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-discord-lightGray" />
                  Tickets, Forms &amp; AFK
                </p>
                <p className="mt-2 text-sm text-discord-lighterGray">
                  Advanced tickets with categories, intake forms, priorities, claim/assign, canned responses, ratings, SLA &amp; inactivity automation — plus forms, temp roles and AFK.
                </p>
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-discord-lightGray">
              Self-hosted, lightweight and free of third-party API dependencies.
            </p>
          </section>

          <footer className="mt-16 w-full border-t border-discord-gray/30 pt-6 text-xs text-discord-lightGray">
            © {new Date().getFullYear()} OnboardX
          </footer>
        </div>
      </div>
    </div>
  );
}