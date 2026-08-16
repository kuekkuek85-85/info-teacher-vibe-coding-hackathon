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
    <section className="tile">
      <p className="eyebrow">이전 단계에서 가져옴</p>
      <dl className="mt-4 space-y-5">
        {carryover.map((c) => {
          const value = progress?.missions?.[c.fromMission]?.data?.[c.fromKey];
          return (
            <div key={`${c.fromMission}.${c.fromKey}`}>
              <dt className="caption">{c.label}</dt>
              <dd className="mt-2 whitespace-pre-wrap">
                {value?.trim() ? value : "이전 단계 제출물이 아직 없습니다"}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
