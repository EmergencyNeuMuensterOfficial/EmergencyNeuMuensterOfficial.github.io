"use client";

import { useEffect, useState } from "react";

export function ModuleToggle({
  label,
  description,
  defaultOn,
}: {
  label: string;
  description?: string;
  defaultOn: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  const [spin, setSpin] = useState<"on" | "off" | null>(null);

  useEffect(() => {
    if (!spin) return;
    const id = window.setTimeout(() => setSpin(null), 520);
    return () => window.clearTimeout(id);
  }, [spin]);

  return (
    <button
      type="button"
      onClick={() => {
        if (spin) return;
        const next = !on;
        setSpin(next ? "on" : "off");
        setOn(next);
      }}
      className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-discord-gray/20 bg-discord-dark p-4 text-left hover:bg-discord-gray/30"
    >
      <span className="min-w-0 pr-3">
        <span className="block text-sm font-semibold text-discord-white">
          {label}
        </span>
        {description ? (
          <span className="mt-1 block text-xs font-normal leading-relaxed text-discord-lighterGray">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full ${
          on ? "bg-discord-green" : "bg-discord-gray"
        }`}
        aria-hidden
      >
        <span
          className={`toggle-knob ${
            spin === "on"
              ? "toggle-knob-on"
              : spin === "off"
                ? "toggle-knob-off"
                : ""
          }`}
          style={
            spin
              ? undefined
              : { transform: on ? "translateX(20px)" : "translateX(0)" }
          }
        />
      </span>
    </button>
  );
}
