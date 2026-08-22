"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function StatusRefresh() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  return (
    <button
      type="button"
      className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-discord-lighterGray hover:bg-discord-dark hover:text-discord-white"
      aria-label="Refresh"
      onClick={() => {
        setSpinning(true);
        router.refresh();
        window.setTimeout(() => setSpinning(false), 600);
      }}
    >
      <RefreshCw
        className={`h-5 w-5 ${spinning ? "animate-spin" : ""}`}
        aria-hidden
      />
    </button>
  );
}
