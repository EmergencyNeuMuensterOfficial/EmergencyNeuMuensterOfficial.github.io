import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="card max-w-3xl">
      <h1 className="text-lg font-semibold text-discord-white">
        Privacy Policy
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-discord-lighterGray">
        OnboardX stores the Discord IDs it needs to run: guild IDs, role IDs,
        channel IDs, and verification state for members going through CAPTCHA.
        We do not sell this data.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-discord-lighterGray">
        Message content is used only when a command or verification step
        requires it. You can remove the bot from a server at any time to stop
        further collection. For a data deletion request, open a ticket in the
        support server.
      </p>
    </article>
  );
}
