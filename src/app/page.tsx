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

          <section id="features" className="mt-16 w-full text-left">
            <h2 className="text-center text-2xl font-bold">What is OnboardX?</h2>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6">
                <p className="font-semibold text-discord-blue">Automated welcome</p>
                <p className="mt-1 text-sm text-discord-lighterGray">
                  OnboardX automatically welcomes every new member with customizable messages and roles — no manual work.
                </p>
              </div>
              <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6">
                <p className="font-semibold text-discord-blue">No external APIs</p>
                <p className="mt-1 text-sm text-discord-lighterGray">
                  Self-hosted and lightweight. No embedded panels or third-party services required.
                </p>
              </div>
              <div className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6">
                <p className="font-semibold text-discord-blue">Live sharding insights</p>
                <p className="mt-1 text-sm text-discord-lighterGray">
                  Watch cluster, shard and gateway health in real time on the status page.
                </p>
              </div>
            </div>
          </section>

          <footer className="mt-16 w-full border-t border-discord-gray/30 pt-6 text-xs text-discord-lightGray">
            © {new Date().getFullYear()} OnboardX
          </footer>
        </div>
      </div>
    </div>
  );
}