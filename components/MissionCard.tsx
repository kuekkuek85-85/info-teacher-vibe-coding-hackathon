"use client";

import Link from "next/link";
import type { Mission, MissionEntry } from "@/lib/types";

const GATE_MISSIONS = new Set(["m5", "m8"]);

export default function MissionCard({
  mission,
  entry,
  isCurrent,
}: {
  mission: Mission;
  entry?: MissionEntry;
  isCurrent: boolean;
}) {
  const isGate = GATE_MISSIONS.has(mission.id);
  const status =
    entry?.status === "submitted" ? "제출됨" : entry?.data ? "작성 중" : "미시작";

  return (
    <Link href={`/mission/${mission.id}`} className="plate block">
      <div className="section-bar">
        <span className="bar-glyph" />
        {mission.id} · {mission.stepLabel}
        {isGate ? (
          <span
            className="ml-auto bg-amber px-2 py-[1px] text-carbon micro font-bold"
            style={{ borderRadius: 2 }}
          >
            검토 게이트
          </span>
        ) : null}
      </div>

      {/* 페이지 색조는 히어로에만 쓴다. 카드의 강조는 표면 승급으로. */}
      <div className={isCurrent ? "plate-raised p-3" : "bg-canvasSoft p-3"}>
        <p className="wordmark-sm text-[20px]">{mission.title}</p>
        <p className="mt-2 font-bold text-carbon">{mission.session}</p>
        <p className="mt-1 text-inkSoft">
          {status}
          {entry?.status === "submitted" ? " · 눌러서 수정" : ""}
        </p>
      </div>
    </Link>
  );
}
