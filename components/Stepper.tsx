"use client";

import { useRouter } from "next/navigation";
import type { Mission, Progress } from "@/lib/types";

export default function Stepper({
  missions,
  progress,
  selected,
  onSelect,
}: {
  missions: Mission[];
  progress: Progress | null;
  /** 지금 펼쳐 놓은 칸. 없으면 진행 중인 칸을 표시한다 */
  selected?: string | null;
  /** 주면 같은 화면에서 칸을 바꾼다. 없으면 미션 화면으로 넘어간다 */
  onSelect?: (id: string) => void;
}) {
  const router = useRouter();
  const current = selected ?? progress?.currentStep;

  return (
    <div className="-mx-6 overflow-x-auto px-6">
      <ol className="flex min-w-max gap-2">
        {missions.map((m) => {
          const entry = progress?.missions?.[m.id];
          const done = entry?.status === "submitted";
          const locked = !m.open;
          const isCurrent = m.id === current && !locked;

          // 선택된 칸은 주요 동작과 같은 검정 채움이다. 이 시스템의 규칙이다.
          const tone = locked
            ? "bg-surfaceSoft text-ink cursor-not-allowed"
            : isCurrent
              ? "bg-ink text-canvas"
              : "bg-canvas text-ink border border-hairline";

          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() =>
                  onSelect ? onSelect(m.id) : router.push(`/mission/${m.id}`)
                }
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${m.id} ${m.title}, ${
                  locked ? "잠김" : done ? "제출됨" : isCurrent ? "지금 여기" : "열림"
                }`}
                className={`flex min-h-[44px] w-[104px] shrink-0 flex-col justify-center gap-1 px-4 py-2 text-left ${tone}`}
                style={{ borderRadius: 50 }}
              >
                <span className="caption">
                  {m.id}
                  {done ? " ●" : ""}
                  {locked ? " 잠김" : ""}
                </span>
                <span className="body-sm truncate">{m.stepLabel}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
