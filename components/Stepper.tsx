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
    <div className="overflow-x-auto">
      <ol className="flex min-w-max gap-[3px]">
        {missions.map((m) => {
          const entry = progress?.missions?.[m.id];
          const done = entry?.status === "submitted";
          const locked = !m.open;
          const isCurrent = m.id === current && !locked;

          // 지금 여기만 시그널 오렌지로 빛난다. 잠긴 칸은 가라앉은 인디고.
          // 오렌지 위에는 카본 글자를 올린다. 흰 글자는 대비가 2.4:1 로 읽기 어렵다.
          const tone = locked
            ? "bg-mutedIndigo text-white cursor-not-allowed"
            : isCurrent
              ? "bg-signal text-carbon"
              : "bg-periwinkle text-ink hover:bg-canvasSoft";

          const bevel = locked
            ? { borderTop: "1px solid #7a7bb0", borderBottom: "2px solid #3d4f97" }
            : isCurrent
              ? { borderTop: "1px solid #ffc17a", borderBottom: "2px solid #a85c0c" }
              : { borderTop: "1px solid #b6c4e4", borderBottom: "2px solid #3d4f97" };

          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => router.push(`/mission/${m.id}`)}
                className={`flex w-[84px] shrink-0 flex-col gap-[2px] px-2 py-2 text-left ${tone}`}
                style={{ borderRadius: 2, ...bevel }}
              >
                <span className="chrome-label flex items-center gap-1">
                  {m.id}
                  {done ? <span className="text-brand">●</span> : null}
                  {locked ? <span>🔒</span> : null}
                </span>
                <span className="micro truncate font-bold">{m.stepLabel}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
