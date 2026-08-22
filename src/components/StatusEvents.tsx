"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Maintenance = {
  id: string;
  title: string;
  when: string;
  status: string;
  services: string;
  summary: string;
  impact: string;
  work: string;
  notes: string;
};

type Incident = {
  id: string;
  title: string;
  date: string;
  duration: string;
  service: string;
  status: "Investigating" | "Identified" | "Monitoring" | "Resolved";
  summary: string;
  impact: string;
  cause: string;
  timeline: {
    time: string;
    status: "Investigating" | "Identified" | "Monitoring" | "Resolved";
    text: string;
  }[];
};

type EventsResponse = {
  ok?: boolean;
  data?: {
    incidents?: Incident[];
    maintenance?: Maintenance[];
  };
};

function pill(status: string) {
  if (status === "Operational" || status === "Online" || status === "Resolved") {
    return "bg-discord-green/15 text-discord-green";
  }
  if (
    status === "Degraded" ||
    status === "Scheduled" ||
    status === "Monitoring" ||
    status === "Identified"
  ) {
    return "bg-discord-yellow/15 text-discord-yellow";
  }
  return "bg-discord-red/15 text-discord-red";
}

type Modal =
  | { kind: "maintenance"; item: Maintenance }
  | { kind: "incident"; item: Incident }
  | null;

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-discord-lightGray">
        {label}
      </p>
      <p className="mt-1 text-sm text-discord-white">{value}</p>
    </div>
  );
}

export function StatusEvents() {
  const [modal, setModal] = useState<Modal>(null);
  const [mounted, setMounted] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<Maintenance[]>([]);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/status-events", { cache: "no-store" });
      const payload = (await res.json()) as EventsResponse;
      if (payload.ok && payload.data) {
        setIncidents(payload.data.incidents ?? []);
        setMaintenanceItems(payload.data.maintenance ?? []);
      }
    } catch {
      // keep empty
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [modal]);

  const dialog =
    modal && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
            <button
              type="button"
              className="absolute inset-0 cursor-pointer bg-black/70"
              aria-label="Close"
              onClick={() => setModal(null)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="status-event-title"
              className="relative z-10 max-h-[min(36rem,85vh)] w-full max-w-lg overflow-y-auto rounded-2xl border border-discord-gray/30 bg-discord-darker p-5 shadow-lg shadow-black/50"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      id="status-event-title"
                      className="text-base font-semibold text-discord-white"
                    >
                      {modal.item.title}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pill(modal.item.status)}`}
                    >
                      {modal.item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-discord-lighterGray">
                    {modal.item.summary}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-discord-lighterGray hover:bg-discord-dark hover:text-discord-white"
                  aria-label="Close"
                  onClick={() => setModal(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {modal.kind === "maintenance" ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Fact label="When" value={modal.item.when} />
                  <Fact label="Services" value={modal.item.services} />
                  <div className="sm:col-span-2">
                    <Fact label="Impact" value={modal.item.impact} />
                  </div>
                  <div className="sm:col-span-2">
                    <Fact label="What we will do" value={modal.item.work} />
                  </div>
                  <div className="sm:col-span-2">
                    <Fact label="Notes" value={modal.item.notes} />
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Fact label="Date" value={modal.item.date} />
                    <Fact label="Duration" value={modal.item.duration} />
                    <Fact label="Service" value={modal.item.service} />
                    <Fact label="Cause" value={modal.item.cause} />
                    <div className="sm:col-span-2">
                      <Fact label="Impact" value={modal.item.impact} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-discord-lightGray">
                      Timeline
                    </p>
                    <ol className="mt-2 space-y-2">
                      {modal.item.timeline.map((entry) => (
                        <li
                          key={entry.time}
                          className="rounded-xl bg-discord-dark px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pill(entry.status)}`}
                            >
                              {entry.status}
                            </span>
                            <p className="text-xs font-semibold text-discord-white">
                              {entry.time}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-discord-lighterGray">
                            {entry.text}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <section className="mt-10">
        <h2 className="text-sm font-semibold text-discord-white">
          Maintenance
        </h2>
        <p className="mt-1 text-sm text-discord-lighterGray">
          Upcoming windows and when they run.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
          {maintenanceItems.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-discord-lighterGray">
              No upcoming maintenance windows.
            </p>
          ) : maintenanceItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setModal({ kind: "maintenance", item })}
              className="flex w-full cursor-pointer flex-col border-t border-discord-gray/20 px-4 py-4 text-left first:border-t-0 hover:bg-discord-dark"
            >
              <span className="text-sm font-semibold text-discord-white">
                {item.title}
              </span>
              <span className="mt-1 text-xs text-discord-lighterGray">
                When: {item.when}
              </span>
              <span className="mt-1 text-sm text-discord-lighterGray">
                {item.summary}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-discord-white">
          Incident history
        </h2>
        <p className="mt-1 text-sm text-discord-lighterGray">
          Open and past incidents.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-discord-gray/20 bg-discord-darker">
          {incidents.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-discord-lighterGray">
              No incidents recorded.
            </p>
          ) : incidents.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setModal({ kind: "incident", item })}
              className="flex w-full cursor-pointer flex-col border-t border-discord-gray/20 px-4 py-4 text-left first:border-t-0 hover:bg-discord-dark"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-discord-white">
                  {item.title}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pill(item.status)}`}
                >
                  {item.status}
                </span>
              </span>
              <span className="mt-1 text-xs text-discord-lighterGray">
                {item.date} · {item.duration} · {item.service}
              </span>
              <span className="mt-1 text-sm text-discord-lighterGray">
                {item.summary}
              </span>
            </button>
          ))}
        </div>
      </section>

      {dialog}
    </>
  );
}
