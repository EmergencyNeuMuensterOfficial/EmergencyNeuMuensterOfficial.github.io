import { Sidebar } from '../components/Sidebar';
import { Reveal } from '../components/Reveal';
import { UptimeTracker } from '../components/UptimeTracker';

const STATS = [
  { value: '96%', label: 'of members complete onboarding', delay: 0 },
  { value: '3K+', label: 'servers onboarded', delay: 120 },
  { value: '24/7', label: 'automated moderation cover', delay: 240 },
];

const FEATURES = [
  {
    dot: 'bg-discord-blue',
    title: 'Automated Onboarding',
    text: 'Custom welcome messages, verification steps and auto-roles get new members set up in minutes — no manual work.',
  },
  {
    dot: 'bg-discord-red',
    title: 'Verification & Security',
    text: 'Math or image captcha verification, anti-spam, honeypots and security profiles keep raids and bots out.',
  },
  {
    dot: 'bg-discord-red',
    title: 'Raid Protection Suite',
    text: 'Anti-nuke rolling-window protection, Enterprise alt-account detection and shared cross-server blocklists stop destructive raids and ban evaders.',
  },
  {
    dot: 'bg-discord-blue',
    title: 'Birthdays & Anniversaries',
    text: 'Members can set their birthday once; the bot announces it every year in the server timezone (DST-safe) with an optional 24h anniversary role.',
  },
  {
    dot: 'bg-discord-yellow',
    title: 'Moderation Suite',
    text: 'Warns, timeouts, purging, bans and full moderation case history with optional log channels.',
  },
  {
    dot: 'bg-discord-green',
    title: 'Leveling & XP',
    text: 'XP rewards, rank cards, leaderboards and automatic level roles keep your community engaged.',
  },
  {
    dot: 'bg-discord-purple',
    title: 'Giveaways, Polls & Events',
    text: 'Run giveaways, polls and RSVP events to keep activity flowing inside your server.',
  },
  {
    dot: 'bg-discord-lightGray',
    title: 'Tickets, Forms & AFK',
    text: 'Advanced tickets with categories, intake forms, priorities, claim/assign, canned responses, ratings, SLA & inactivity automation — plus forms, temp roles and AFK.',
  },
];

export default function HomePage() {
  return (
    <div className="bg-discord-darkest text-discord-white">
      <Sidebar />
      <div className="ml-60 min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
          <Reveal className="animate-fade-in-up">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-discord-blue/10 animate-glow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon"
                alt="OnboardX logo"
                className="h-16 w-16 object-contain drop-shadow animate-float-y"
              />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mt-7 text-4xl font-extrabold tracking-tight sm:text-5xl animate-gradient-x bg-gradient-to-r from-discord-blue via-discord-purple to-discord-blue bg-clip-text text-transparent">
              OnboardX
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-3 max-w-xl text-lg text-discord-lighterGray animate-fade-in-up">
              A Discord bot that helps server owners onboard new members with a smooth, automated welcome experience.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up">
              <a
                href="/status"
                className="rounded-lg bg-discord-blue px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-discord-blue/80 hover:shadow-lg hover:shadow-discord-blue/30"
              >
                View System Status
              </a>
              <a
                href="#features"
                className="rounded-lg border border-discord-gray bg-discord-dark px-6 py-3 text-sm font-semibold text-discord-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-discord-gray/50 hover:shadow-lg"
              >
                Learn More
              </a>
            </div>
          </Reveal>

          <div className="mt-14 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            {STATS.map((stat) => (
              <Reveal key={stat.label} delay={stat.delay}>
                <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-discord-blue/50 hover:shadow-lg hover:shadow-discord-blue/10">
                  <p className="text-2xl font-bold text-discord-blue">{stat.value}</p>
                  <p className="mt-1 text-sm text-discord-lighterGray">{stat.label}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <UptimeTracker />

          <section id="features" className="mt-16 w-full">
            <Reveal>
              <h2 className="text-center text-2xl font-bold">Features</h2>
            </Reveal>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <Reveal key={feature.title} delay={(index % 2) * 100}>
                  <div className="h-full rounded-2xl border border-discord-gray/30 bg-discord-dark p-6 transition-all duration-300 hover:-translate-y-1 hover:border-discord-blue/50 hover:bg-discord-gray/20 hover:shadow-lg hover:shadow-discord-blue/10">
                    <p className="flex items-center gap-2.5 font-semibold text-discord-white">
                      <span className={`h-2.5 w-2.5 rounded-full ${feature.dot} animate-pulse`} />
                      {feature.title}
                    </p>
                    <p className="mt-2 text-sm text-discord-lighterGray">{feature.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={150}>
              <p className="mt-6 text-center text-sm text-discord-lightGray animate-fade-in-up">
                Self-hosted, lightweight and free of third-party API dependencies.
              </p>
            </Reveal>
          </section>

          <footer className="mt-16 w-full border-t border-discord-gray/30 pt-6 text-xs text-discord-lightGray">
            © {new Date().getFullYear()} OnboardX
          </footer>
        </div>
      </div>
    </div>
  );
}