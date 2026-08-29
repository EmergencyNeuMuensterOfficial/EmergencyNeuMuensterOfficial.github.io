"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Dropdown } from "@/components/Dropdown";
import { ModuleToggle } from "@/components/ToggleSwitch";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "incidents", label: "Incidents" },
  { id: "maintenance", label: "Maintenance" },
  { id: "clusters", label: "Clusters" },
] as const;

const INCIDENT_STATUSES = [
  { value: "Investigating", label: "Investigating" },
  { value: "Identified", label: "Identified" },
  { value: "Monitoring", label: "Monitoring" },
  { value: "Resolved", label: "Resolved" },
];

const SERVICES = ["Bot", "Discord Gateway", "Database", "Website"];

type ControlCommand = {
  id: string;
  action: string;
  clusterId: number | null;
  status: "queued" | "running" | "done" | "failed";
  requestedAt: string | null;
  error: string | null;
};

type AdminStatus = {
  isOnline: boolean;
  state: string;
  totalGuilds: number;
  totalUsers: number;
  shardCount: number;
  readyShards: number;
  clusterCount: number;
  readyClusters: number;
  averagePing: number;
  maintenance: { enabled: boolean; message: string | null };
  clusters?: Array<{
    clusterId: number;
    guilds: number;
    ping: number;
    online: boolean;
    stale: boolean;
    guildPlacements?: Array<{
      id: string;
      name: string;
      shardId: number | null;
      memberCount: number | null;
    }>;
  }>;
};

type AccessData = {
  loggedIn: boolean;
  allowed: boolean;
  whitelisted: boolean;
  adminToken: boolean;
  username?: string;
};

type Incident = {
  id: string;
  title: string;
  service: string;
  status: string;
  updated: string;
  summary?: string;
  impact?: string;
  cause?: string;
  date?: string;
  duration?: string;
  timeline?: { time: string; status: string; text: string }[];
};

type Window = {
  id: string;
  title: string;
  when: string;
  services: string;
  summary?: string;
  impact?: string;
  work?: string;
  notes?: string;
};

function pill(status: string) {
  if (status === "Resolved" || status === "Online") {
    return "bg-discord-green/15 text-discord-green";
  }
  if (status === "Monitoring" || status === "Identified" || status === "Degraded") {
    return "bg-discord-yellow/15 text-discord-yellow";
  }
  return "bg-discord-red/15 text-discord-red";
}

function clusterState(online: boolean, stale: boolean, ping = 0) {
  if (stale) return "Offline";
  if (!online || ping < 0) return "Offline";
  return "Online";
}

export function AdminPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [access, setAccess] = useState<AccessData | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [statusData, setStatusData] = useState<AdminStatus | null>(null);
  const [commands, setCommands] = useState<ControlCommand[]>([]);
  const [loading, setLoading] = useState(true);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [windows, setWindows] = useState<Window[]>([]);
  const [title, setTitle] = useState("");
  const [service, setService] = useState("Bot");
  const [incidentStatus, setIncidentStatus] = useState("Investigating");
  const [maintTitle, setMaintTitle] = useState("");
  const [maintWhen, setMaintWhen] = useState("");
  const [restarting, setRestarting] = useState<number | null>(null);
  const [openCluster, setOpenCluster] = useState<number | null>(null);
  const [guildQuery, setGuildQuery] = useState("");

  const checkAccess = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/access", { cache: "no-store" });
      const data = (await res.json()) as AccessData;
      setAccess(data);
    } catch {
      setAccess({ loggedIn: false, allowed: false, whitelisted: false, adminToken: false });
    }
  }, []);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, eventsRes] = await Promise.all([
        fetch("/api/admin/status", { cache: "no-store" }),
        fetch("/api/status-events", { cache: "no-store" }),
      ]);
      if (statusRes.ok) {
        const payload = (await statusRes.json()) as { ok?: boolean; data?: { status: AdminStatus; commands: ControlCommand[] } };
        if (payload.ok && payload.data) {
          setStatusData(payload.data.status);
          setCommands(payload.data.commands);
        }
      }
      if (eventsRes.ok) {
        const payload = (await eventsRes.json()) as { ok?: boolean; data?: { incidents?: Incident[]; maintenance?: Window[] } };
        if (payload.ok && payload.data) {
          setIncidents((payload.data.incidents ?? []).map((i) => ({
            id: i.id,
            title: i.title,
            service: i.service,
            status: i.status,
            updated: i.updated ?? "",
          })));
          setWindows((payload.data.maintenance ?? []).map((w) => ({
            id: w.id,
            title: w.title,
            when: w.when,
            services: w.services,
          })));
        }
      }
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (access?.allowed) {
      void loadData();
    }
  }, [access, loadData]);

  async function handleLogin() {
    if (!password.trim()) return;
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      if (!res.ok) {
        setLoginError("Invalid admin key.");
        return;
      }
      setPassword("");
      await checkAccess();
    } catch {
      setLoginError("Login failed.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function sendCommand(action: string, clusterId?: number) {
    try {
      const body: Record<string, unknown> = { action };
      if (clusterId != null) body.clusterId = clusterId;
      await fetch("/api/admin/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      void loadData();
    } catch {
      // silently fail
    }
  }

  async function postIncident() {
    if (!title.trim()) return;
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "incident",
          title: title.trim(),
          service,
          status: incidentStatus,
        }),
      });
      if (res.ok) {
        const payload = (await res.json()) as { ok?: boolean; id?: string };
        if (payload.ok && payload.id) {
          setIncidents((list) => [
            {
              id: payload.id!,
              title: title.trim(),
              service,
              status: incidentStatus,
              updated: "Just now",
            },
            ...list,
          ]);
        }
      }
    } catch {
      // silently fail
    }
    setTitle("");
    setIncidentStatus("Investigating");
  }

  async function addWindow() {
    if (!maintTitle.trim() || !maintWhen.trim()) return;
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "maintenance",
          title: maintTitle.trim(),
          when: maintWhen.trim(),
          services: "Website",
        }),
      });
      if (res.ok) {
        const payload = (await res.json()) as { ok?: boolean; id?: string };
        if (payload.ok && payload.id) {
          setWindows((list) => [
            {
              id: payload.id!,
              title: maintTitle.trim(),
              when: maintWhen.trim(),
              services: "Website",
            },
            ...list,
          ]);
        }
      }
    } catch {
      // silently fail
    }
    setMaintTitle("");
    setMaintWhen("");
  }

  if (!access) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-discord-white">Admin</h1>
        <p className="mt-1 text-sm text-discord-lighterGray">Checking access...</p>
      </div>
    );
  }

  if (!access.allowed) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-discord-white">Admin</h1>
        <p className="mt-1 text-sm text-discord-lighterGray">
          {access.loggedIn
            ? "You do not have admin access."
            : "Log in with a whitelisted Discord account or enter the admin key."}
        </p>

        {access.loggedIn && !access.whitelisted && (
          <p className="mt-3 text-sm text-discord-lighterGray">
            Signed in as <span className="font-semibold text-discord-white">{access.username}</span>.
          </p>
        )}

        <div className="mt-6 max-w-sm rounded-2xl border border-discord-gray/20 bg-discord-darker p-5">
          <label className="block text-sm font-medium text-discord-lighterGray">
            Admin key
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleLogin();
              }}
              className="mt-2 w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
              placeholder="Enter admin key"
            />
          </label>
          {loginError && (
            <p className="mt-2 text-sm text-discord-red">{loginError}</p>
          )}
          <button
            type="button"
            className="btn-primary mt-4"
            disabled={loggingIn}
            onClick={() => void handleLogin()}
          >
            {loggingIn ? "Logging in..." : "Login"}
          </button>
        </div>
      </div>
    );
  }

  const openIncidents = commands.filter((c) => c.status === "queued" || c.status === "running").length;

  return (
    <div>
      <h1 className="text-lg font-semibold text-discord-white">Admin</h1>
      <p className="mt-1 text-sm text-discord-lighterGray">
        Staff console for the bot and status posts.
      </p>

      <nav
        className="mt-6 flex flex-wrap gap-1 rounded-full border border-discord-gray/30 bg-discord-darker p-1"
        aria-label="Admin sections"
      >
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex min-h-9 cursor-pointer items-center rounded-full px-3 text-sm font-semibold ${
                active
                  ? "bg-discord-dark text-discord-white"
                  : "text-discord-lighterGray hover:bg-discord-dark/70 hover:text-discord-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === "overview" ? (
        <div className="mt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { value: String(statusData?.totalGuilds ?? "102"), label: "Guilds" },
              { value: String(statusData?.clusterCount ?? "3"), label: "Clusters" },
              { value: String(openIncidents + incidents.filter((i) => i.status !== "Resolved").length), label: "Open incidents" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6"
              >
                <p className="text-2xl font-bold text-discord-white">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-discord-lighterGray">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <ModuleToggle
              label="Read-only mode"
              description="Block dashboard writes. Verification and the bot stay up."
              defaultOn={false}
            />
            <ModuleToggle
              label="Invite lock"
              description="Hide Add to Discord until staff turns this off."
              defaultOn={false}
            />
          </div>
        </div>
      ) : null}

      {tab === "incidents" ? (
        <div className="mt-6">
          <div className="rounded-2xl border border-discord-gray/20 bg-discord-darker p-4">
            <p className="text-sm font-semibold text-discord-white">
              Post incident
            </p>
            <label className="mt-3 block text-sm font-medium text-discord-lighterGray">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
                placeholder="Short public title"
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-discord-lighterGray">
                  Service
                </p>
                <Dropdown
                  value={service}
                  options={SERVICES.map((name) => ({
                    value: name,
                    label: name,
                  }))}
                  onChange={setService}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-discord-lighterGray">
                  Status
                </p>
                <Dropdown
                  value={incidentStatus}
                  options={INCIDENT_STATUSES}
                  onChange={setIncidentStatus}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={postIncident}
            >
              Post
            </button>
          </div>

          {commands.length > 0 && (
            <div className="mt-4 rounded-2xl border border-discord-gray/20 bg-discord-darker p-4">
              <p className="text-sm font-semibold text-discord-white">
                Recent control commands
              </p>
              <div className="mt-3 space-y-2">
                {commands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-discord-dark px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-discord-white">
                      {cmd.action.replace(/_/g, " ")}
                    </span>
                    {cmd.clusterId != null && (
                      <span className="text-xs text-discord-lighterGray">
                        cluster {cmd.clusterId}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        cmd.status === "done"
                          ? "bg-discord-green/15 text-discord-green"
                          : cmd.status === "failed"
                            ? "bg-discord-red/15 text-discord-red"
                            : cmd.status === "running"
                              ? "bg-discord-yellow/15 text-discord-yellow"
                              : "bg-discord-gray/15 text-discord-lighterGray"
                      }`}
                    >
                      {cmd.status}
                    </span>
                    {cmd.requestedAt && (
                      <span className="ml-auto text-xs text-discord-lighterGray">
                        {new Date(cmd.requestedAt).toLocaleTimeString()}
                      </span>
                    )}
                    {cmd.error && (
                      <span className="w-full text-xs text-discord-red">{cmd.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
            {incidents.map((item) => (
              <div
                key={item.id}
                className="border-t border-discord-gray/20 px-4 py-4 first:border-t-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-discord-white">
                    {item.title}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pill(item.status)}`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-discord-lighterGray">
                  {item.service} · {item.updated}
                </p>
                  <div className="max-w-xs">
                    <Dropdown
                      value={item.status}
                      options={INCIDENT_STATUSES}
                      onChange={(next) => {
                        void fetch("/api/admin/events", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: item.id, kind: "incident", status: next }),
                        });
                        setIncidents((list) =>
                          list.map((row) =>
                            row.id === item.id
                              ? { ...row, status: next, updated: "Just now" }
                              : row,
                          ),
                        );
                      }}
                    />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "maintenance" ? (
        <div className="mt-6">
          <div className="rounded-2xl border border-discord-gray/20 bg-discord-darker p-4">
            <p className="text-sm font-semibold text-discord-white">
              Schedule window
            </p>
            <label className="mt-3 block text-sm font-medium text-discord-lighterGray">
              Title
              <input
                value={maintTitle}
                onChange={(e) => setMaintTitle(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
                placeholder="What is changing"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-discord-lighterGray">
              When
              <input
                value={maintWhen}
                onChange={(e) => setMaintWhen(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
                placeholder="Tuesday 2 Sep 2026, 04:00–04:30 UTC"
              />
            </label>
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={addWindow}
            >
              Schedule
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
            {windows.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 border-t border-discord-gray/20 px-4 py-4 first:border-t-0"
              >
                <div>
                  <p className="text-sm font-semibold text-discord-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-discord-lighterGray">
                    When: {item.when}
                  </p>
                  <p className="mt-1 text-sm text-discord-lighterGray">
                    {item.services}
                  </p>
                </div>
                  <button
                    type="button"
                    className="inline-flex min-h-9 cursor-pointer items-center rounded-full px-3 text-sm font-semibold text-discord-red hover:bg-discord-red/15"
                    onClick={() => {
                      void fetch(`/api/admin/events?id=${item.id}&kind=maintenance`, { method: "DELETE" });
                      setWindows((list) => list.filter((row) => row.id !== item.id));
                    }}
                  >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "clusters" ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-discord-lighterGray">Loading clusters...</p>
          ) : (statusData?.clusters ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-discord-lighterGray">No cluster data available.</p>
          ) : (
            (statusData?.clusters ?? []).map((cluster) => {
              const state = clusterState(cluster.online, cluster.stale, cluster.ping);
              const expanded = openCluster === cluster.clusterId;
              const placements = cluster.guildPlacements ?? [];
              const query = guildQuery.trim().toLowerCase();
              const filtered = query
                ? placements.filter((g) => g.name.toLowerCase().includes(query) || g.id.includes(query))
                : placements;
              return (
                <div
                  key={cluster.clusterId}
                  className="border-t border-discord-gray/20 first:border-t-0"
                >
                  <div className="flex flex-wrap items-center gap-3 px-4 py-4">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-left"
                      aria-expanded={expanded}
                      onClick={() => {
                        setOpenCluster(expanded ? null : cluster.clusterId);
                        setGuildQuery("");
                      }}
                    >
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-discord-lighterGray transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                      <p className="text-sm font-semibold text-discord-white">
                        Cluster {cluster.clusterId}
                      </p>
                    </button>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pill(state)}`}
                    >
                      {state}
                    </span>
                    <p className="text-xs text-discord-lighterGray">
                      {cluster.guilds} guilds · {cluster.ping >= 0 ? `${cluster.ping}ms` : "—"}
                    </p>
                    <button
                      type="button"
                      className="ml-auto inline-flex min-h-9 cursor-pointer items-center rounded-full bg-discord-dark px-3 text-sm font-semibold text-discord-white hover:bg-discord-gray/50"
                      disabled={restarting === cluster.clusterId}
                      onClick={() => {
                        setRestarting(cluster.clusterId);
                        void sendCommand("restart_cluster", cluster.clusterId);
                        window.setTimeout(() => setRestarting(null), 3000);
                      }}
                    >
                      {restarting === cluster.clusterId ? "Restarting..." : "Restart"}
                    </button>
                  </div>

                  {expanded ? (
                    <div className="border-t border-discord-gray/20 bg-discord-dark px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-discord-lighterGray">
                          Guilds on this cluster
                          {placements.length > 0 ? ` (${placements.length})` : ""}
                        </p>
                        {placements.length > 0 && (
                          <input
                            value={guildQuery}
                            onChange={(e) => setGuildQuery(e.target.value)}
                            className="w-full max-w-xs rounded-2xl border border-discord-gray/40 bg-discord-darker px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
                            placeholder="Search guilds…"
                          />
                        )}
                      </div>

                      {placements.length === 0 ? (
                        <p className="mt-3 text-sm text-discord-lighterGray">
                          No guild placement data reported for this cluster.
                        </p>
                      ) : filtered.length === 0 ? (
                        <p className="mt-3 text-sm text-discord-lighterGray">No guilds match your search.</p>
                      ) : (
                        <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto pr-1">
                          {filtered.map((g) => (
                            <li
                              key={g.id}
                              className="flex flex-wrap items-center gap-2 rounded-xl bg-discord-darker px-3 py-2"
                            >
                              <span className="text-sm font-semibold text-discord-white">
                                {g.name}
                              </span>
                              {g.shardId != null && (
                                <span className="text-xs text-discord-lighterGray">
                                  shard {g.shardId}
                                </span>
                              )}
                              {g.memberCount != null && (
                                <span className="ml-auto text-xs text-discord-lighterGray">
                                  {g.memberCount.toLocaleString()} members
                                </span>
                              )}
                              <span className="w-full font-mono text-[11px] text-discord-lightGray">
                                {g.id}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          <div className="flex flex-wrap gap-2 border-t border-discord-gray/20 px-4 py-4">
            <button
              type="button"
              className="btn-primary"
              onClick={() => void sendCommand("restart_all")}
            >
              Restart All Clusters
            </button>
            <button
              type="button"
              className="inline-flex min-h-9 cursor-pointer items-center rounded-full bg-discord-dark px-3 text-sm font-semibold text-discord-white hover:bg-discord-gray/50"
              onClick={() => void sendCommand("shutdown_all")}
            >
              Shutdown All
            </button>
            <button
              type="button"
              className="inline-flex min-h-9 cursor-pointer items-center rounded-full bg-discord-dark px-3 text-sm font-semibold text-discord-white hover:bg-discord-gray/50"
              onClick={() => void sendCommand(statusData?.maintenance?.enabled ? "maintenance_off" : "maintenance_on")}
            >
              {statusData?.maintenance?.enabled ? "Disable Maintenance" : "Enable Maintenance"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
