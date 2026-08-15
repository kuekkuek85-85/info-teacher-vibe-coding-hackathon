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
    <section className="plate">
      <div className="section-bar">
        <span className="bar-glyph" />
        이전 단계에서 가져옴
      </div>
      <dl className="plate-inset m-2 space-y-3 p-3">
        {carryover.map((c) => {
          const value = progress?.missions?.[c.fromMission]?.data?.[c.fromKey];
          return (
            <div key={`${c.fromMission}.${c.fromKey}`}>
              <dt className="chrome-label text-inkSoft">{c.label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-ink">
                {value?.trim() ? value : "이전 단계 제출물이 아직 없습니다"}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
