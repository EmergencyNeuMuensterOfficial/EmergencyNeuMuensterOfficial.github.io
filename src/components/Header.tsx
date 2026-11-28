"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { DashboardSidebar, useServerDashboardPath } from "@/components/DashboardSidebar";
import { LINKS } from "@/lib/content";

interface MeUser {
  id: string;
  username: string;
  avatar: string | null;
  globalName: string | null;
}

const NAV = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/status", label: "Status" },
  { href: "/admin", label: "Admin" },
];

function avatarUrl(user: MeUser, size = 128): string {
  if (user.avatar) {
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
  }
  return `https://cdn.discordapp.com/embed/avatars/${Number(user.id) % 5}.png`;
}

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label="Primary">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`inline-flex min-h-9 cursor-pointer items-center rounded-full px-3 text-sm font-semibold transition-colors duration-200 ${
              active
                ? "bg-discord-dark text-discord-white"
                : "text-discord-lighterGray hover:bg-discord-dark/70 hover:text-discord-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountMenu({
  compact,
  user,
  onLogout,
}: {
  compact?: boolean;
  user: MeUser | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  if (!user) {
    return (
      <a
        href="/api/auth/discord"
        className={`inline-flex cursor-pointer items-center justify-center rounded-full border border-discord-gray bg-discord-dark text-sm font-semibold text-discord-white hover:bg-discord-gray/50 ${
          compact ? "min-h-11 w-full px-4" : "h-9 px-3"
        }`}
      >
        Log in with Discord
      </a>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${compact ? "w-full" : ""}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-full hover:bg-discord-dark ${
          compact ? "min-h-11 w-full px-2" : "h-9 pl-1 pr-2"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl(user, 64)}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full"
        />
        <span className="min-w-0 flex-1 text-left">
          <span
            className={`truncate text-sm font-semibold text-discord-white ${
              compact ? "block" : "hidden max-w-[7rem] lg:block"
            }`}
          >
            {user.globalName || user.username}
          </span>
          {compact ? (
            <span className="block truncate text-xs text-discord-lighterGray">
              @{user.username}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-discord-lighterGray transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      <div
        className={`absolute z-[60] mt-2 origin-top overflow-hidden rounded-2xl border border-discord-gray/30 bg-discord-darker p-1 shadow-lg shadow-black/40 transition-[opacity,transform] duration-200 ${
          compact ? "left-0 right-0" : "right-0 w-52"
        } ${
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
        role="menu"
      >
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-discord-white">
            {user.globalName || user.username}
          </p>
          <p className="text-xs text-discord-lighterGray">
            @{user.username}
          </p>
        </div>
        <button
          type="button"
          role="menuitem"
          className="flex min-h-10 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold text-discord-red hover:bg-discord-red/15"
          onClick={() => {
            setOpen(false);
            onLogout();
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}

export function HeaderBar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [inviteLocked, setInviteLocked] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = (await response.json()) as { authed?: boolean; user?: MeUser };
      setUser(payload.authed && payload.user ? payload.user : null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    void fetch("/api/site-settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { inviteLock?: boolean }) => setInviteLocked(data.inviteLock === true))
      .catch(() => setInviteLocked(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 px-4">
      <div
        className={`pointer-events-auto mx-auto max-w-4xl border border-discord-gray/30 bg-discord-darker shadow-lg shadow-black/40 ${
          open ? "rounded-3xl" : "rounded-full"
        }`}
      >
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <BrandMark compact />
          <NavLinks className="hidden items-center gap-0.5 md:flex" />

          <div className="ml-auto hidden items-center gap-2 md:flex">
            <a
              href={LINKS.support}
              className="inline-flex min-h-9 cursor-pointer items-center rounded-full px-3 text-sm font-semibold text-discord-lighterGray transition-colors duration-200 hover:bg-discord-dark hover:text-discord-white"
              target="_blank"
              rel="noreferrer"
            >
              Support
            </a>
            {!inviteLocked && <a
              href={LINKS.invite}
              className="inline-flex min-h-9 cursor-pointer items-center rounded-full bg-discord-blue px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-discord-blue/80"
              target="_blank"
              rel="noreferrer"
            >
              Add to Discord
            </a>}
            <AccountMenu user={user} onLogout={handleLogout} />
          </div>

          <button
            type="button"
            className="ml-auto inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-discord-white hover:bg-discord-dark md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-discord-gray/20 px-3 pb-4 pt-2 md:hidden">
            <NavLinks
              className="flex flex-col gap-1"
              onNavigate={() => setOpen(false)}
            />
            <div className="mt-3 flex flex-col gap-2">
              {user ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-discord-gray bg-discord-dark px-4 text-sm font-semibold text-discord-white hover:bg-discord-gray/50"
                  onClick={() => {
                    setOpen(false);
                    void handleLogout();
                  }}
                >
                  Log out
                </button>
              ) : (
                <a
                  href="/api/auth/discord"
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-discord-gray bg-discord-dark px-4 text-sm font-semibold text-discord-white hover:bg-discord-gray/50"
                >
                  Log in with Discord
                </a>
              )}
              {!inviteLocked && <a
                href={LINKS.invite}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-discord-blue px-4 text-sm font-semibold text-white hover:bg-discord-blue/80"
                target="_blank"
                rel="noreferrer"
              >
                Add to Discord
              </a>}
              <a
                href={LINKS.support}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-discord-gray bg-discord-dark px-4 text-sm font-semibold text-discord-white hover:bg-discord-gray/50"
                target="_blank"
                rel="noreferrer"
              >
                Support server
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function SiteFooter({ fixed = false }: { fixed?: boolean }) {
  return (
    <footer
      className={`${
        fixed ? "fixed inset-x-0 bottom-0 z-30" : "relative z-20"
      } border-t border-discord-gray/20 bg-discord-darkest px-4 py-4 text-xs font-medium text-discord-lightGray`}
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/terms" className="hover:text-discord-white">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-discord-white">
          Privacy
        </Link>
        <a
          href={LINKS.support}
          className="hover:text-discord-white"
          target="_blank"
          rel="noreferrer"
        >
          Support
        </a>
        <a
          href={LINKS.topgg}
          className="hover:text-discord-white"
          target="_blank"
          rel="noreferrer"
        >
          top.gg
        </a>
      </div>
    </footer>
  );
}

export function PageFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const home = pathname === "/";
  const serverDash = Boolean(useServerDashboardPath());
  const pinnedFooter =
    pathname.startsWith("/dashboard") ||
    pathname === "/status" ||
    pathname === "/admin";

  return (
    <div className="min-h-screen bg-discord-darkest">
      <HeaderBar />
      {serverDash ? (
        <Suspense>
          <DashboardSidebar />
        </Suspense>
      ) : null}
      <main
        className={
          home
            ? ""
            : pinnedFooter
              ? `px-4 pb-24 pt-24 md:px-6 ${serverDash ? "pl-28 lg:pl-72" : ""}`
              : "px-4 pb-10 pt-24 md:px-6"
        }
      >
        {home ? children : <div className="mx-auto max-w-4xl">{children}</div>}
      </main>
      <SiteFooter fixed={pinnedFooter} />
    </div>
  );
}
