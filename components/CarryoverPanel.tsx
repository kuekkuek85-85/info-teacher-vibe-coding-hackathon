"use client";

import type { Carryover, Progress } from "@/lib/types";

export default function CarryoverPanel({
  carryover,
  progress,
}: {
  carryover: Carryover[];
  progress: Progress | null;
}) {
  if (!carryover?.length) return null;

  return (
    <section className="rounded-[20px] bg-surface2 p-6">
      <p className="text-[13px] text-inkMuted">이전 단계에서 가져옴</p>
      <dl className="mt-3 space-y-4">
        {carryover.map((c) => {
          const value = progress?.missions?.[c.fromMission]?.data?.[c.fromKey];
          return (
            <div key={`${c.fromMission}.${c.fromKey}`}>
              <dt className="text-[13px] text-inkMuted">{c.label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-[15px]">
                {value?.trim() ? value : "이전 단계 제출물이 아직 없습니다"}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
