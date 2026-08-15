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

  const surface = isGate
    ? "rounded-[20px] bg-gradient-to-br from-gMagenta to-gViolet p-6"
    : isCurrent
      ? "card-featured"
      : "card";

  return (
    <Link href={`/mission/${mission.id}`} className={`${surface} block`}>
      <p className="text-[13px] text-inkMuted">
        {mission.stepLabel} · {mission.session}
      </p>
      <h2 className="display mt-2 text-2xl">
        {mission.id} {mission.title}
      </h2>
      <p className="mt-4 text-sm text-inkMuted">
        {status}
        {entry?.status === "submitted" ? " · 눌러서 수정" : ""}
      </p>
    </Link>
  );
}
