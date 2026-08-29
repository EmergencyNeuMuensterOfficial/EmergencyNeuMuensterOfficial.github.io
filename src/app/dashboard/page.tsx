"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiHeaders } from "@/lib/clientApi";

interface GuildCard {
  id: string;
  name: string;
  iconUrl: string | null;
  owner: boolean;
}

interface MeUser {
  id: string;
  username: string;
}

interface GuildsResponse {
  data?: {
    user?: MeUser;
    guilds?: GuildCard[];
    missingBotToken?: boolean;
  };
  error?: string;
}

const VERSION = "v1";

export default function DashboardPage() {
  const [guilds, setGuilds] = useState<GuildCard[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/guilds", {
        cache: "no-store",
        headers: apiHeaders(),
      });
      if (response.status === 401) {
        window.location.assign(`/api/auth/discord?next=${encodeURIComponent("/dashboard")}`);
        return;
      }
      const payload = (await response.json()) as GuildsResponse;
      if (!response.ok) throw new Error(payload.error || "Failed to load servers");
      setGuilds(payload.data?.guilds ?? []);
      setUserId(payload.data?.user?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load servers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-discord-white">Server picker</h1>
        <p className="mt-1 text-sm text-discord-lighterGray">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-discord-white">Server picker</h1>
        <p className="mt-1 text-sm text-discord-red">{error}</p>
        {!error.includes("logged in") && (
          <button
            type="button"
            onClick={() => void load()}
            className="btn-primary mt-4"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-discord-white">Server picker</h1>
      <p className="mt-1 text-sm text-discord-lighterGray">
        Choose a server to open the bot dashboard.
      </p>

      {guilds.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-discord-gray/20 bg-discord-darker p-8 text-center">
          <p className="text-sm text-discord-lighterGray">
            No manageable servers found. OnboardX is not in any of your servers.
          </p>
          <a
            href="https://discord.com/oauth2/authorize?client_id=1399710116449878017&permissions=268446800&scope=bot%20applications.commands"
            className="btn-primary mt-4 inline-flex"
            target="_blank"
            rel="noreferrer"
          >
            Add OnboardX to a server
          </a>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guilds.map((guild) => (
            <Link
              key={guild.id}
              href={`/dashboard/servers/${userId ?? ""}/${guild.id}/${VERSION}`}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-discord-gray/20 bg-discord-darker p-4 text-left font-semibold text-discord-white hover:border-discord-blue/50 hover:bg-discord-dark"
            >
              {guild.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={guild.iconUrl}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-discord-dark text-sm font-semibold text-discord-white">
                  {guild.name.slice(0, 1)}
                </span>
              )}
              {guild.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
