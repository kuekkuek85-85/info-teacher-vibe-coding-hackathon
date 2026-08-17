"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CarryoverPanel from "@/components/CarryoverPanel";
import GrillPanel from "@/components/GrillPanel";
import MissionForm from "@/components/MissionForm";
import PeerReviewSection from "@/components/PeerReviewSection";
import PeerToolLinks from "@/components/PeerToolLinks";
import PromptCard from "@/components/PromptCard";
import { buildPromptText, liveData } from "@/lib/promptCard";
import type { Mission, MissionTool, Progress } from "@/lib/types";

const GATE_MISSIONS = new Set(["m5", "m8"]);

// 블록 색이 진행 방식을 가른다. 게이트는 색 대신 표식으로 말한다.
const TOOL_TONE: Record<MissionTool, string> = {
  human: "bg-blockCream",
  chat: "bg-blockLilac",
  agent: "bg-blockLime",
};
const TOOL_LINE: Record<MissionTool, string> = {
  human: "여기는 직접 적습니다. AI에게 묻지 말고 내 수업을 떠올려 보세요.",
  chat: "여기는 대화형 AI로 합니다. 클로드나 Chat GPT 대화창을 쓰세요.",
  agent: "여기부터는 클로드 코드로 합니다. 대화창이 아니라 코드를 직접 고치는 도구입니다.",
};

/**
 * 한 미션의 본문. 홈에서는 스텝퍼 아래에, /mission/[id] 에서는 그 화면에 그린다.
 * 두 자리가 같은 것을 보여야 해서 한 곳에 모아 두었다.
 */
export default function MissionDetail({
  mission,
  missions,
  progress,
  name,
  onSave,
  onSubmit,
}: {
  mission: Mission;
  missions: Mission[];
  progress: Progress | null;
  name: string;
  onSave: (data: Record<string, string>) => Promise<void>;
  onSubmit: () => Promise<void>;
}) {
  const isGate = GATE_MISSIONS.has(mission.id);
  const tool = mission.tool ?? "human";

  // 같은 미션의 값을 카드에 채우는 자리가 있다. 저장을 기다리면 방금 적은 것이 빠진다.
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  useEffect(() => setDraft(null), [mission.id]);

  const card = mission.promptCard ? (
    <PromptCard
      // 칸을 옮기면 카드를 새로 만든다. 앞 칸에서 고친 내용이 남지 않는다.
      // 아래 폼과 같은 부모에 서므로 열쇠가 겹치지 않게 앞말을 붙인다.
      key={`card-${mission.id}`}
      text={buildPromptText(mission, missions, progress)}
      storageKey={`prompt:${name}:${mission.id}`}
      filled={Boolean(mission.promptFill)}
      tool={mission.promptTool ?? mission.tool}
    />
  ) : null;

  // m2 는 적은 자리에서 바로 캐묻는다. 지금 치고 있는 값을 그대로 보낸다.
  const live = liveData(progress, mission.id, draft);
  const grill =
    mission.id === "m2" ? (
      <GrillPanel name={name} idea={live.oneline ?? ""} roles={live.user ?? ""} />
    ) : null;

  return (
    <>
      {/* 이 화면의 색 블록은 여기 하나뿐이다. 아래는 흰 캔버스로 돌아간다. */}
      <header className={`color-block ${TOOL_TONE[tool]}`}>
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow">
            {mission.id} · {mission.stepLabel} · {mission.session}
          </p>
          {isGate ? (
            <span
              className="caption bg-ink px-3 py-1 text-canvas"
              style={{ borderRadius: 50 }}
            >
              검토 게이트
            </span>
          ) : null}
        </div>
        <h1 className="display-lg mt-4">{mission.title}</h1>
        <p className="body-lg mt-6">{mission.toolLine ?? TOOL_LINE[tool]}</p>
      </header>

      <div className="mt-10 space-y-8">
        <CarryoverPanel carryover={mission.carryover} progress={progress} />

        <div className="md">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{mission.guide}</ReactMarkdown>
        </div>

        {card}

        {mission.id === "m8" ? <PeerToolLinks target={progress?.reviewTarget} /> : null}

        {mission.id === "m9" ? (
          <section className="card">
            <p className="eyebrow">발표 원고</p>
            <p className="body-sm mt-4">
              지금까지 적은 것으로 README 초안을 만들어 둡니다. 열어서 고친 다음 저장소에
              올리세요.
            </p>
            <Link href="/readme" className="btn-primary mt-5">
              README 초안 열기
            </Link>
          </section>
        ) : null}

        <MissionForm
          key={`form-${mission.id}`}
          mission={mission}
          progress={progress}
          name={name}
          onSave={onSave}
          onSubmit={onSubmit}
          onValuesChange={grill ? setDraft : undefined}
          slot={grill ?? undefined}
          slotAfter={grill ? "user" : undefined}
        />

        {mission.id === "m5" ? (
          <PeerReviewSection myName={name} target={progress?.reviewTarget} />
        ) : null}
      </div>
    </>
  );
}
