import { FeaturePager } from "@/components/FeaturePager";
import { FEATURES, LINKS } from "@/lib/content";

export default function HomePage() {
  return (
    <div>
      <section className="sticky top-0 z-0 flex min-h-screen flex-col items-center justify-center bg-discord-darkest px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-discord-white sm:text-6xl">
          OnboardX
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-discord-lighterGray">
          Welcome. Verify. Join with confidence.
        </p>
        <a
          href={LINKS.invite}
          className="btn-primary mt-8"
          target="_blank"
          rel="noreferrer"
        >
          Add to Discord
        </a>
      </section>

      {FEATURES.map((feature, index) => (
        <section
          key={feature.title}
          id={index === 0 ? "features" : undefined}
          className="sticky top-0 flex min-h-screen flex-col items-center justify-center bg-discord-darkest px-6 text-center"
          style={{ zIndex: index + 1 }}
        >
          <p className="text-xs font-medium text-discord-lightGray">
            {index + 1} / {FEATURES.length}
          </p>
          <h2 className="mt-3 text-3xl font-bold text-discord-white sm:text-4xl">
            {feature.title}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-discord-lighterGray">
            {feature.text}
          </p>
        </section>
      ))}

      <div className="h-screen bg-discord-darkest" aria-hidden />
      <FeaturePager count={FEATURES.length} />
    </div>
  );
}
