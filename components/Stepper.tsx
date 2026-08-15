"use client";

import { useRouter } from "next/navigation";
import type { Mission, Progress } from "@/lib/types";

export default function Stepper({
  missions,
  progress,
}: {
  missions: Mission[];
  progress: Progress | null;
}) {
  const router = useRouter();
  const current = progress?.currentStep;

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <ol className="flex min-w-max gap-2">
        {missions.map((m) => {
          const entry = progress?.missions?.[m.id];
          const done = entry?.status === "submitted";
          const locked = !m.open;
          const isCurrent = m.id === current && !locked;

          const base =
            "flex w-[92px] shrink-0 flex-col gap-1 rounded-[10px] px-3 py-2 text-left";
          const tone = locked
            ? "bg-surface1 text-inkMuted cursor-not-allowed"
            : isCurrent
              ? "bg-gradient-to-br from-gViolet to-[#4a2fd0] text-ink"
              : "bg-surface1 text-ink hover:bg-surface2";

          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => router.push(`/mission/${m.id}`)}
                className={`${base} ${tone}`}
              >
                <span className="flex items-center gap-1 text-[13px] tnum">
                  {m.id}
                  {done ? <span className="text-success">✓</span> : null}
                  {locked ? <span aria-label="잠김">🔒</span> : null}
                </span>
                <span className="truncate text-[13px]">{m.stepLabel}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
