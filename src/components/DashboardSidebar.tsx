"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, Settings } from "lucide-react";
import { apiHeaders } from "@/lib/clientApi";

interface GuildCard {
  id: string;
  name: string;
  iconUrl: string | null;
  owner: boolean;
}

interface GuildsResponse {
  data?: {
    user?: { id: string };
    guilds?: GuildCard[];
  };
}

const ITEMS = [
  { id: "general", label: "General", icon: Settings },
  { id: "modules", label: "Modules", icon: LayoutGrid },
];

const VERSION = "v1";

export function useServerDashboardPath() {
  const pathname = usePathname();
  const match = pathname.match(
    /^\/dashboard\/servers\/([^/]+)\/([^/]+)\/([^/]+)/,
  );
  if (!match) return null;
  return {
    sessionId: match[1],
    guildId: match[2],
    version: match[3],
  };
}

export function DashboardSidebar() {
  const route = useServerDashboardPath();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "modules" ? "modules" : "general";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const [guilds, setGuilds] = useState<GuildCard[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const loadGuilds = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/guilds", {
        cache: "no-store",
        headers: apiHeaders(),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as GuildsResponse;
      setGuilds(payload.data?.guilds ?? []);
      setUserId(payload.data?.user?.id ?? null);
    } catch {
      // silently fail — sidebar degrades gracefully
    }
  }, []);

  useEffect(() => {
    void loadGuilds();
  }, [loadGuilds]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!route) return null;

  const server = guilds.find((s) => s.id === route.guildId);
  const name = server?.name ?? "Server";
  const tabQuery = tab === "modules" ? "?tab=modules" : "";

  const links = (
    <nav className="flex flex-col gap-1" aria-label="Server sections">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
          <Link
            key={item.id}
            href={`${pathname}?tab=${item.id}`}
            scroll={false}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 cursor-pointer items-center justify-center gap-3 rounded-2xl px-3 text-sm font-semibold lg:justify-start ${
              active
                ? "bg-discord-dark text-discord-white"
                : "text-discord-lighterGray hover:bg-discord-dark hover:text-discord-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <aside
      ref={rootRef}
      className={`fixed bottom-20 left-12 top-24 z-40 flex flex-col rounded-3xl border border-discord-gray/30 bg-discord-darker p-2 lg:left-16 lg:p-3 ${
        open ? "w-56" : "w-14 lg:w-56"
      }`}
      aria-label="Server dashboard"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label="Switch server"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-1 py-2 text-left hover:bg-discord-dark lg:px-2"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-discord-dark text-sm font-semibold text-discord-white">
          {name.slice(0, 1)}
        </span>
        <span className={`min-w-0 flex-1 ${open ? "block" : "hidden lg:block"}`}>
          <span className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold text-discord-white">
              {name}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-discord-lighterGray transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </span>
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="mt-1 max-h-48 overflow-y-auto">
            {guilds.map((item) => {
              const active = item.id === route.guildId;
              return (
                <li key={item.id}>
                  <Link
                    href={`/dashboard/servers/${userId ?? ""}/${item.id}/${VERSION}${tabQuery}`}
                    onClick={() => setOpen(false)}
                    className={`mt-1 flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl px-2 text-sm font-semibold ${
                      active
                        ? "bg-discord-dark text-discord-white"
                        : "text-discord-lighterGray hover:bg-discord-dark hover:text-discord-white"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-discord-darkest text-xs font-semibold text-discord-white">
                      {item.name.slice(0, 1)}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto">{links}</div>

      <Link
        href="/dashboard"
        className="mt-2 flex min-h-11 cursor-pointer items-center justify-center rounded-2xl px-2 text-center text-xs font-semibold text-discord-lighterGray hover:bg-discord-dark hover:text-discord-white lg:text-sm"
      >
        <span className="hidden lg:inline">Change server</span>
        <span className="lg:hidden">Back</span>
      </Link>
    </aside>
  );
}
