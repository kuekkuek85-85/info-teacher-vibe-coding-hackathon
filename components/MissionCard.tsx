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

  // 카드는 흰 캔버스에 헤어라인. 강조는 굵기와 검정 칩으로 낸다.
  return (
    <Link href={`/mission/${mission.id}`} className="card block">
      <div className="flex items-center gap-3">
        <span className="eyebrow">{mission.id}</span>
        {isGate ? (
          <span
            className="caption bg-blockLilac px-3 py-1"
            style={{ borderRadius: 50 }}
          >
            검토 게이트
          </span>
        ) : null}
        {isCurrent ? (
          <span
            className="caption bg-ink px-3 py-1 text-canvas"
            style={{ borderRadius: 50 }}
          >
            지금 여기
          </span>
        ) : null}
      </div>

      <p className="card-title mt-4">{mission.title}</p>
      <p className="body-sm mt-2">
        {mission.stepLabel} · {mission.session}
      </p>
      <p className="body-sm link-strong mt-4">
        {status}
        {entry?.status === "submitted" ? " · 눌러서 수정" : ""}
      </p>
    </Link>
  );
}
