'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '../../../components/Sidebar';
import { Reveal } from '../../../components/Reveal';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
];

const MODULES: { key: string; label: string; description: string }[] = [
  { key: 'logging', label: 'Logging', description: 'Audit log events to a channel' },
  { key: 'verification', label: 'Verification', description: 'Math / image captcha on join' },
  { key: 'leveling', label: 'Leveling', description: 'XP, ranks and role rewards' },
  { key: 'giveaways', label: 'Giveaways', description: 'Create and manage giveaways' },
  { key: 'polls', label: 'Polls', description: 'Reaction-based polls' },
  { key: 'joinRoles', label: 'Join Roles', description: 'Auto-assign roles on join' },
  { key: 'welcome', label: 'Welcome', description: 'Welcome & farewell messages' },
  { key: 'automod', label: 'AutoMod', description: 'Word / link / caps / zalgo filters' },
  { key: 'antispam', label: 'AntiSpam', description: 'Duplicate & raid protection' },
  { key: 'reactionRoles', label: 'Reaction Roles', description: 'Role menus on messages' },
  { key: 'tickets', label: 'Tickets', description: 'Support ticket threads' },
  { key: 'inviteTracking', label: 'Invite Tracking', description: 'Track invites & fake joins' },
  { key: 'tempVoice', label: 'Temp Voice', description: 'Self-hosted voice channels' },
  { key: 'integrations', label: 'Integrations', description: 'Webhooks & external services' },
  { key: 'sticky', label: 'Sticky', description: 'Pin messages to a channel' },
  { key: 'counting', label: 'Counting', description: 'Counting game channel' },
  { key: 'honeypot', label: 'Honeypot', description: 'Catch malicious users' },
  { key: 'tempRoles', label: 'Temp Roles', description: 'Time-limited roles' },
  { key: 'security', label: 'Security', description: 'Security profiles & rules' },
];

interface GuildConfig {
  prefix?: string;
  language?: string;
  modules?: Record<string, boolean>;
}

interface ConfigResponse {
  data?: {
    guild?: { name: string; icon: string | null };
    config?: GuildConfig;
  };
  error?: string;
}

export default function GuildDashboardPage({ params }: { params: { guildId: string } }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [guildName, setGuildName] = useState<string | null>(null);
  const [prefix, setPrefix] = useState('!');
  const [language, setLanguage] = useState('en');
  const [modules, setModules] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/guilds/${params.guildId}`, { cache: 'no-store' });
      const payload = (await response.json()) as ConfigResponse;
      if (response.status === 401 || response.status === 403) {
        setError(payload.error || 'You cannot manage this server.');
        return;
      }
      if (!response.ok) {
        // 404 = no config yet, defaults apply
        if (response.status === 404) {
          setError(null);
        } else {
          setError(payload.error || 'Failed to load settings.');
        }
      }
      const config = payload.data?.config;
      setGuildName(payload.data?.guild?.name ?? null);
      if (config) {
        setPrefix(config.prefix ?? '!');
        setLanguage(config.language ?? 'en');
        setModules(config.modules ?? {});
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, [params.guildId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/guilds/${params.guildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, language, modules }),
      });
      const payload = (await response.json()) as ConfigResponse;
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save settings.');
      }
      if (payload.data?.config) {
        setModules(payload.data.config.modules ?? {});
      }
      setSavedAt(new Date().toLocaleTimeString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (key: string) => {
    setModules((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="min-h-screen bg-discord-darkest text-white">
      <Sidebar />
      <div className="ml-60">
        <div className="flex items-center justify-between border-b border-discord-gray/20 bg-discord-darker/80 px-6 py-4 animate-fade-in-up">
          <div>
            <Link href="/dashboard" className="text-xs text-discord-blue transition hover:underline">
              ← Dashboard
            </Link>
            <h1 className="mt-0.5 text-sm font-bold leading-tight">{guildName ?? 'Server Settings'}</h1>
          </div>
          <button
            onClick={() => void save()}
            disabled={saving || loading}
            className="rounded-lg bg-discord-blue px-4 py-2 text-xs font-semibold text-white transition hover:bg-discord-blue/80 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        <main className="mx-auto max-w-3xl px-6 py-10">
          {error && (
            <p className="mb-6 rounded-lg border border-discord-red/40 bg-discord-red/10 px-4 py-3 text-sm text-discord-red">
              {error}
            </p>
          )}

          {savedAt && (
            <p className="mb-6 rounded-lg border border-discord-green/40 bg-discord-green/10 px-4 py-3 text-sm text-discord-green">
              Settings saved at {savedAt}.
            </p>
          )}

          {loading ? (
            <p className="text-sm text-discord-lightGray">Loading settings…</p>
          ) : (
            <>
              <Reveal>
              <section className="animate-fade-in-up rounded-2xl border border-discord-gray/20 bg-discord-darker p-6">
                <h2 className="text-sm font-semibold text-discord-lighterGray">General</h2>
                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-discord-lightGray">Command prefix</span>
                    <input
                      value={prefix}
                      maxLength={4}
                      onChange={(event) => setPrefix(event.target.value)}
                      className="mt-1.5 w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-discord-lightGray">Language</span>
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="discord-select mt-1.5 w-full"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
              </Reveal>

              <Reveal delay={100}>
              <section className="animate-fade-in-up mt-6 rounded-2xl border border-discord-gray/20 bg-discord-darker p-6">
                <h2 className="text-sm font-semibold text-discord-lighterGray">Modules</h2>
                <p className="mt-1 text-xs text-discord-lightGray">
                  Enable or disable features for this server.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {MODULES.map((module) => {
                    const enabled = modules[module.key] === true;
                    return (
                      <button
                        key={module.key}
                        type="button"
                        onClick={() => toggleModule(module.key)}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${
                          enabled
                            ? 'border-discord-blue/50 bg-discord-blue/10'
                            : 'border-discord-gray/20 bg-discord-dark hover:bg-discord-gray/30'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-discord-white">{module.label}</p>
                          <p className="mt-0.5 text-xs text-discord-lightGray">{module.description}</p>
                        </div>
                        <span
                          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                            enabled ? 'bg-discord-green' : 'bg-discord-gray'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                              enabled ? 'left-[22px]' : 'left-0.5'
                            }`}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
              </Reveal>
            </>
          )}
        </main>
      </div>
    </div>
  );
}