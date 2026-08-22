"use client";

import { useEffect, useState } from "react";

const DOT = 8;
const PILL = 48;

export function FeaturePager({ count }: { count: number }) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const vh = window.innerHeight || 1;
      const t = window.scrollY / vh;

      if (t < 1) {
        setVisible(false);
        return;
      }

      const feature = Math.min(count - 1, Math.max(0, Math.floor(t) - 1));
      const local = Math.min(1, Math.max(0, t - Math.floor(t)));
      const last = feature === count - 1 && t >= count;
      setVisible(true);
      setIndex(feature);
      setProgress(last ? Math.min(1, t - count) : local);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [count]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
      role="status"
      aria-label={`Feature ${index + 1} of ${count}, ${Math.round(progress * 100)} percent through this page`}
    >
      <div className="flex items-center gap-2 rounded-full bg-black px-4 py-3">
        {Array.from({ length: count }, (_, i) => {
          const active = i === index;
          return (
            <span
              key={i}
              className="relative block overflow-hidden rounded-full bg-white/35 transition-[width] duration-300 ease-out"
              style={{ width: active ? PILL : DOT, height: DOT }}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-white"
                style={{ width: active ? `${progress * 100}%` : "0%" }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
