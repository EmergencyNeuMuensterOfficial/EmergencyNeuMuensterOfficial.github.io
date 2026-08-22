"use client";

import { useCallback, useEffect, useState } from "react";
import { ClusterCards } from "@/components/ClusterCards";
import { StatusEvents } from "@/components/StatusEvents";
import { StatusRefresh } from "@/components/StatusRefresh";

interface StatusData {
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
}

function pill(status: string) {
  if (status === "Operational" || status === "Online" || status === "Resolved") {
    return "bg-discord-green/15 text-discord-green";
  }
  if (status === "Degraded") {
    return "bg-discord-yellow/15 text-discord-yellow";
  }
  return "bg-discord-red/15 text-discord-red";
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      const payload = (await response.json()) as { ok?: boolean; data?: StatusData };
      if (payload.ok && payload.data) {
        setStatus(payload.data);
      }
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const services = [
    { name: "Bot", status: status?.isOnline ? "Operational" : "Offline" },
    { name: "Discord Gateway", status: status?.state === "running" ? "Operational" : status?.state === "maintenance" ? "Degraded" : "Offline" },
    { name: "Database", status: "Operational" },
    { name: "Website", status: "Operational" },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-discord-white">
            System status
          </h1>
          <p className="mt-1 text-sm text-discord-lighterGray">
            Live look at OnboardX services, clusters, and shards.
          </p>
        </div>
        <StatusRefresh />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service) => (
          <article
            key={service.name}
            className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6"
          >
            <p className="text-sm font-semibold text-discord-white">
              {service.name}
            </p>
            <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${pill(service.status)}`}>
              {service.status}
            </p>
          </article>
        ))}
      </div>

      {status && (
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            { value: String(status.totalGuilds), label: "Guilds" },
            { value: String(status.totalUsers), label: "Users" },
            { value: `${status.readyShards}/${status.shardCount}`, label: "Shards" },
            { value: status.averagePing >= 0 ? `${status.averagePing}ms` : "—", label: "Ping" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-discord-gray/30 bg-discord-dark p-6"
            >
              <p className="text-2xl font-bold text-discord-white">{stat.value}</p>
              <p className="mt-1 text-sm text-discord-lighterGray">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {status?.maintenance?.enabled && (
        <div className="mt-6 rounded-2xl border border-discord-yellow/40 bg-discord-yellow/5 p-5">
          <p className="text-sm font-semibold text-discord-yellow">
            Scheduled maintenance
          </p>
          <p className="mt-1 text-sm text-discord-lighterGray">
            {status.maintenance.message ?? "Maintenance is in progress."}
          </p>
        </div>
      )}

      <ClusterCards />

      <StatusEvents />
    </div>
  );
}
