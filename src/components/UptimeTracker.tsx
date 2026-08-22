'use client';

import { useEffect, useState } from 'react';

interface UptimeDay {
  date: string;
  totalChecks: number;
  onlineChecks: number;
  uptimePct: number | null;
}

interface UptimeResponse {
  ok?: boolean;
  data?: {
    windowDays: number;
    overallPct: number | null;
    days: UptimeDay[];
  };
}

function barColor(day: UptimeDay): string {
  if (day.uptimePct == null || day.totalChecks === 0) return 'bg-discord-gray/40';
  if (day.uptimePct >= 99) return 'bg-discord-green';
  if (day.uptimePct >= 90) return 'bg-discord-yellow';
  return 'bg-discord-red';
}

function dayLabel(day: UptimeDay): string {
  if (day.uptimePct == null || day.totalChecks === 0) return `${day.date}: no data`;
  return `${day.date}: ${day.uptimePct}%`;
}

export function UptimeTracker() {
  const [days, setDays] = useState<UptimeDay[] | null>(null);
  const [overallPct, setOverallPct] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/v1/api/uptime?days=30', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as UptimeResponse;
        if (!response.ok || !payload.data) throw new Error('failed');
        if (cancelled) return;
        setDays(payload.data.days);
        setOverallPct(payload.data.overallPct);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return null;

  return (
    <section id="uptime" className="mt-16 w-full">
      <div className="mx-auto max-w-3xl rounded-2xl border border-discord-gray/30 bg-discord-dark p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">Global uptime</h2>
          <span className="text-xs text-discord-lightGray">last 30 days</span>
        </div>
        <p className="mt-1 text-sm text-discord-lightGray">
          {overallPct != null ? (
            <>
              Bot availability over the tracking window:{' '}
              <span className="font-semibold text-discord-white">{overallPct}%</span>
            </>
          ) : (
            'Samples are collected automatically once the bot reports its first heartbeat.'
          )}
        </p>
        <div className="mt-4 flex items-end gap-[3px]" role="img" aria-label="30-day uptime history">
          {(days ?? Array.from({ length: 30 }, () => null)).map((day, index) =>
            day ? (
              <div
                key={day.date}
                title={dayLabel(day)}
                className={`h-9 w-full min-w-0 rounded-sm transition-colors duration-300 hover:opacity-80 ${barColor(day)}`}
              />
            ) : (
              <div
                key={index}
                className="h-9 w-full min-w-0 animate-pulse rounded-sm bg-discord-gray/20"
              />
            )
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-discord-lightGray">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-discord-green" /> 99–100%</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-discord-yellow" /> 90–99%</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-discord-red" /> below 90%</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-discord-gray/40" /> no data</span>
        </div>
      </div>
    </section>
  );
}
