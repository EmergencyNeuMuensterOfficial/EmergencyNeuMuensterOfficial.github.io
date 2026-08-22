"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value)?.label ?? value;

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

  return (
    <div ref={rootRef} className="relative mt-2">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-11 cursor-pointer items-center justify-between rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-left text-sm text-discord-white outline-none transition focus-visible:border-discord-blue"
      >
        <span>{selected}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-discord-lighterGray transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      <div
        className={`absolute z-50 mt-2 w-full origin-top overflow-hidden rounded-2xl border border-discord-gray/30 bg-discord-darker transition-[opacity,transform] duration-200 ${
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <ul id={listId} role="listbox" className="flex flex-col gap-1 p-1">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`flex w-full min-h-10 cursor-pointer items-center rounded-xl px-3 text-left text-sm ${
                    active
                      ? "bg-discord-dark text-discord-white"
                      : "text-discord-lighterGray hover:bg-discord-dark hover:text-discord-white"
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
