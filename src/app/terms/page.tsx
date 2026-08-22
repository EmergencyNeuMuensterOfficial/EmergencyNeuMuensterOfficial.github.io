import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <article className="card max-w-3xl">
      <h1 className="text-lg font-semibold text-discord-white">
        Terms of Service
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-discord-lighterGray">
        By adding OnboardX to a Discord server or using the website, you agree
        to use the bot only on servers you are allowed to manage. You are
        responsible for welcome copy, role mapping, and verification settings
        you configure.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-discord-lighterGray">
        OnboardX may be unavailable during outages or maintenance. We may
        refuse service if the bot is used to spam, harass, or evade Discord’s
        own rules. These terms can change; continued use after an update means
        you accept the new version.
      </p>
    </article>
  );
}
