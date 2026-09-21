"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Dropdown } from "@/components/Dropdown";
import { ModuleToggle } from "@/components/ToggleSwitch";

const MODULES = [
  { key: "logging", label: "Logging", description: "Audit log events to a channel" },
  { key: "verification", label: "Verification", description: "Math / image captcha on join" },
  { key: "leveling", label: "Leveling", description: "XP, ranks and role rewards" },
  { key: "giveaways", label: "Giveaways", description: "Create and manage giveaways" },
  { key: "polls", label: "Polls", description: "Reaction-based polls" },
  { key: "joinRoles", label: "Join Roles", description: "Auto-assign roles on join" },
  { key: "welcome", label: "Welcome", description: "Welcome & farewell messages" },
  { key: "automod", label: "AutoMod", description: "Word / link / caps / zalgo filters" },
  { key: "antispam", label: "AntiSpam", description: "Duplicate & raid protection" },
  { key: "reactionRoles", label: "Reaction Roles", description: "Role menus on messages" },
  { key: "tickets", label: "Tickets", description: "Support ticket threads" },
  { key: "inviteTracking", label: "Invite Tracking", description: "Track invites & fake joins" },
  { key: "tempVoice", label: "Temp Voice", description: "Self-hosted voice channels" },
  { key: "integrations", label: "Integrations", description: "Webhooks & external services" },
  { key: "sticky", label: "Sticky", description: "Pin messages to a channel" },
  { key: "afk", label: "AFK", description: "Track members who are away" },
  { key: "counting", label: "Counting", description: "Counting game channel" },
  { key: "modCases", label: "Moderation Cases", description: "Keep moderation case records" },
  { key: "applicationForms", label: "Application Forms", description: "Enable server application forms" },
  { key: "honeypot", label: "Honeypot", description: "Detect suspicious member activity" },
  { key: "tempRoles", label: "Temporary Roles", description: "Time-limited role assignments" },
  { key: "security", label: "Security", description: "Server security protection" },
  { key: "scheduling", label: "Scheduling", description: "Scheduled server actions" },
  { key: "birthday", label: "Birthday", description: "Birthday and anniversary messages" },
  { key: "antinuke", label: "Anti-Nuke", description: "Protect against destructive actions" },
  { key: "altDetect", label: "Alt Detection", description: "Identify likely alternate accounts" },
  { key: "blocklist", label: "Blocklist", description: "Shared safety blocklist checks" },
];

const MODULE_CONFIG_KEYS: Record<string, string> = {
  giveaways: "giveaway",
  polls: "poll",
};

interface GuildConfig {
  prefix?: string;
  language?: string;
  modules?: Record<string, boolean>;
  [key: string]: unknown;
}

interface ConfigResponse {
  data?: {
    guild?: { name: string; icon: string | null };
    config?: GuildConfig;
  };
  error?: string;
}

function ServerDashboardInner() {
  const params = useParams<{
    sessionId: string;
    guildId: string;
    version: string;
  }>();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab = requestedTab === "modules" || requestedTab === "advanced" ? requestedTab : "general";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [guildName, setGuildName] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("!");
  const [language, setLanguage] = useState("en");
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [activeModule, setActiveModule] = useState(MODULES[0].key);
  const [settingsJson, setSettingsJson] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/guilds/${params.guildId}`, {
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        if (response.status === 401) {
          const next = `${window.location.pathname}${window.location.search}`;
          window.location.assign(`/api/auth/discord?next=${encodeURIComponent(next)}`);
          return;
        }
        setError("You cannot manage this server.");
        return;
      }
      const payload = (await response.json()) as ConfigResponse;
      if (!response.ok && response.status !== 404) {
        setError(payload.error || "Failed to load settings.");
        return;
      }
      setGuildName(payload.data?.guild?.name ?? null);
      const config = payload.data?.config;
      if (config) {
        setPrefix(config.prefix ?? "!");
        setLanguage(config.language ?? "en");
        setModules(config.modules ?? {});
        setSettings(config);
        const firstKey = MODULE_CONFIG_KEYS[MODULES[0].key] ?? MODULES[0].key;
        setSettingsJson(JSON.stringify(config[firstKey] ?? {}, null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [params.guildId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    let nextSettings = settings;
    if (tab === "advanced") {
      try {
        const parsed: unknown = JSON.parse(settingsJson);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Module settings must be a JSON object.");
        }
        const section = MODULE_CONFIG_KEYS[activeModule] ?? activeModule;
        nextSettings = { ...settings, [section]: parsed };
        setSettings(nextSettings);
        setJsonError(null);
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : "Invalid JSON.");
        return;
      }
    }
    setSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const response = await fetch(`/api/dashboard/guilds/${params.guildId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, language, modules, settings: nextSettings }),
      });
      const payload = (await response.json()) as ConfigResponse;
      if (!response.ok) throw new Error(payload.error || "Failed to save settings.");
      if (payload.data?.config) {
        setModules(payload.data.config.modules ?? {});
        setSettings(payload.data.config);
      }
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (key: string) => {
    setModules((current) => ({ ...current, [key]: !current[key] }));
  };

  const selectModuleSettings = (key: string) => {
    setActiveModule(key);
    const section = MODULE_CONFIG_KEYS[key] ?? key;
    setSettingsJson(JSON.stringify(settings[section] ?? {}, null, 2));
    setJsonError(null);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-discord-white">Loading…</h1>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-discord-white">
            {tab === "modules" ? "Modules" : tab === "advanced" ? "Advanced configuration" : "General"}
          </h1>
          <p className="mt-1 text-sm text-discord-lighterGray">
            {guildName ?? "Server settings"}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-discord-red/40 bg-discord-red/10 px-4 py-3 text-sm text-discord-red">
          {error}
        </p>
      )}

      {savedAt && (
        <p className="mt-4 rounded-2xl border border-discord-green/40 bg-discord-green/10 px-4 py-3 text-sm text-discord-green">
          Saved at {savedAt}. OnboardX applies configuration changes within one minute.
        </p>
      )}

      {tab === "general" ? (
        <section className="mt-6 rounded-2xl border border-discord-gray/20 bg-discord-darker p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block text-sm font-medium text-discord-lighterGray">
              Prefix
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
              />
            </label>
            <div className="text-sm font-medium text-discord-lighterGray">
              Language
              <Dropdown
                value={language}
                onChange={setLanguage}
                options={[
                  { value: "en", label: "English" },
                  { value: "de", label: "Deutsch" },
                  { value: "es", label: "Español" },
                  { value: "fr", label: "Français" },
                  { value: "nl", label: "Nederlands" },
                  { value: "pl", label: "Polski" },
                  { value: "pt", label: "Português" },
                  { value: "ru", label: "Русский" },
                ]}
              />
            </div>
          </div>
        </section>
      ) : tab === "modules" ? (
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {MODULES.map((mod) => (
            <ModuleToggle
              key={mod.key}
              label={mod.label}
              description={mod.description}
              defaultOn={modules[mod.key] === true}
              checked={modules[mod.key] === true}
              onCheckedChange={() => toggleModule(mod.key)}
            />
          ))}
        </section>
      ) : (
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1.5fr)]">
          <div className="rounded-2xl border border-discord-gray/20 bg-discord-darker p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-discord-lightGray">
              Module settings
            </p>
            <div className="max-h-[32rem] space-y-1 overflow-y-auto">
              {MODULES.map((mod) => (
                <button
                  key={mod.key}
                  type="button"
                  onClick={() => selectModuleSettings(mod.key)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    activeModule === mod.key
                      ? "bg-discord-blue text-white"
                      : "text-discord-lighterGray hover:bg-discord-dark hover:text-discord-white"
                  }`}
                >
                  <span className="block font-semibold">{mod.label}</span>
                  <span className="block text-xs opacity-75">{modules[mod.key] ? "Enabled" : "Disabled"}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-discord-gray/20 bg-discord-darker p-6">
            <h2 className="text-base font-semibold text-discord-white">
              {MODULES.find((mod) => mod.key === activeModule)?.label} settings
            </h2>
            <p className="mt-1 text-sm text-discord-lighterGray">
              Edit this module’s complete configuration. IDs are Discord channel, role, or user IDs. Valid JSON is required.
            </p>
            <textarea
              value={settingsJson}
              onChange={(event) => {
                setSettingsJson(event.target.value);
                setJsonError(null);
              }}
              spellCheck={false}
              className="mt-4 min-h-80 w-full rounded-2xl border border-discord-gray/40 bg-discord-dark p-4 font-mono text-xs leading-5 text-discord-white outline-none transition focus:border-discord-blue"
              aria-label="Module configuration JSON"
            />
            {jsonError && <p className="mt-3 text-sm text-discord-red">{jsonError}</p>}
            <p className="mt-3 text-xs text-discord-lightGray">
              Save applies this module’s JSON along with the current module switches. Subscription and ownership settings cannot be changed here.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

export default function ServerDashboardPage() {
  return (
    <Suspense>
      <ServerDashboardInner />
    </Suspense>
  );
}
