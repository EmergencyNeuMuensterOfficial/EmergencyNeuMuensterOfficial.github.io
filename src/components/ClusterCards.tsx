"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Shard = {
  id: number;
  guilds: number;
  ping: number;
  state: "Online" | "Degraded" | "Offline";
};

type Cluster = {
  id: number;
  guilds: number;
  ping: number;
  state: "Online" | "Degraded" | "Offline";
  shards: Shard[];
};

interface StatusResponse {
  ok?: boolean;
  data?: {
    clusters?: Array<{
      clusterId: number;
      guilds: number;
      ping: number;
      online: boolean;
      stale: boolean;
      shardStates?: Array<{
        shardId: number;
        guilds: number;
        ping: number;
        ready: boolean;
      }>;
    }>;
  };
}

function pill(status: string) {
  if (status === "Operational" || status === "Online") {
    return "border-discord-green/40 bg-discord-green/15 text-discord-green";
  }
  if (status === "Degraded") {
    return "border-discord-yellow/40 bg-discord-yellow/15 text-discord-yellow";
  }
  return "border-discord-red/40 bg-discord-red/15 text-discord-red";
}

function clusterState(online: boolean, stale: boolean): "Online" | "Degraded" | "Offline" {
  if (stale) return "Offline";
  if (!online) return "Offline";
  return "Online";
}

function shardState(ready: boolean, ping: number): "Online" | "Degraded" | "Offline" {
  if (!ready) return "Offline";
  if (ping > 200) return "Degraded";
  return "Online";
}

export function ClusterCards() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [fly, setFly] = useState<{
    shard: Shard;
    x: number;
    y: number;
    above: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      const payload = (await response.json()) as StatusResponse;
      if (!payload.ok || !payload.data?.clusters) return;

      const mapped: Cluster[] = payload.data.clusters.map((c) => ({
        id: c.clusterId,
        guilds: c.guilds,
        ping: c.ping,
        state: clusterState(c.online, c.stale),
        shards: (c.shardStates ?? []).map((s) => ({
          id: s.shardId,
          guilds: s.guilds,
          ping: s.ping,
          state: shardState(s.ready, s.ping),
        })),
      }));
      setClusters(mapped);
    } catch {
      // keep empty
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function showFly(shard: Shard, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    const above = r.top > 160;
    setFly({
      shard,
      x: r.left + r.width / 2,
      y: above ? r.top - 10 : r.bottom + 10,
      above,
    });
  }

  if (clusters.length === 0) return null;

  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
      <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_auto_1.5rem] gap-3 border-b border-discord-gray/20 px-4 py-3 text-xs font-medium uppercase tracking-wide text-discord-lightGray sm:grid">
        <span>Cluster</span>
        <span>Shards</span>
        <span>Guilds</span>
        <span>Ping</span>
        <span>State</span>
        <span className="sr-only">Expand</span>
      </div>

      {clusters.map((cluster) => {
        const expanded = open === cluster.id;
        return (
          <div key={cluster.id} className="border-t border-discord-gray/20 first:border-t-0 sm:first:border-t-0">
            <button
              type="button"
              className="grid w-full min-h-14 cursor-pointer grid-cols-1 items-center gap-1 px-4 py-3 text-left sm:grid-cols-[1fr_1fr_1fr_1fr_auto_1.5rem] sm:gap-3"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : cluster.id)}
            >
              <span className="text-sm font-semibold text-discord-white">
                Cluster {cluster.id}
              </span>
              <span className="text-xs text-discord-lighterGray sm:font-mono">
                {cluster.shards.length > 0
                  ? `${cluster.shards[0].id}–${cluster.shards[cluster.shards.length - 1].id}`
                  : "—"}
              </span>
              <span className="text-sm text-discord-white">{cluster.guilds}</span>
              <span className="font-mono text-xs text-discord-white">
                {cluster.ping}ms
              </span>
              <span
                className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${pill(cluster.state)}`}
              >
                {cluster.state}
              </span>
              <ChevronDown
                className={`ml-auto h-4 w-4 shrink-0 text-discord-lighterGray transition-transform duration-300 ease-out sm:ml-0 ${
                  expanded ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="px-4 pb-4">
                  <ul className="flex flex-wrap gap-2">
                    {cluster.shards.map((shard) => (
                      <li key={shard.id}>
                        <button
                          type="button"
                          className={`inline-flex h-8 cursor-pointer items-center justify-center rounded-full border px-5 text-sm font-semibold ${pill(shard.state)}`}
                          aria-label={`Shard ${shard.id}, ${shard.state}`}
                          onMouseEnter={(e) => showFly(shard, e.currentTarget)}
                          onMouseLeave={() => setFly(null)}
                          onFocus={(e) => showFly(shard, e.currentTarget)}
                          onBlur={() => setFly(null)}
                        >
                          {shard.id}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {fly && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[60] w-48 rounded-2xl border border-discord-gray/30 bg-discord-darker p-4"
              style={{
                left: fly.x,
                top: fly.y,
                transform: fly.above
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
              }}
              role="tooltip"
            >
              <p className="text-sm font-semibold text-discord-white">
                Shard {fly.shard.id}
              </p>
              <p className="mt-2 text-xs text-discord-lighterGray">
                {fly.shard.guilds} guilds
              </p>
              <p className="mt-1 text-xs text-discord-lighterGray">
                Ping {fly.shard.ping}ms
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
