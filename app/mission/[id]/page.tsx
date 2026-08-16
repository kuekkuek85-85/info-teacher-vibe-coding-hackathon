"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CarryoverPanel from "@/components/CarryoverPanel";
import ExpiredNotice from "@/components/ExpiredNotice";
import MissionForm from "@/components/MissionForm";
import PeerReviewSection from "@/components/PeerReviewSection";
import PeerToolLinks from "@/components/PeerToolLinks";
import PromptCard from "@/components/PromptCard";
import StuckButton from "@/components/StuckButton";
import TutorPanel from "@/components/TutorPanel";
import TopNav from "@/components/TopNav";
import { buildPromptText } from "@/lib/promptCard";
import { clearSession, getSavedName, getSavedRole } from "@/lib/session";
import type { MissionTool } from "@/lib/types";
import { useProgress } from "@/lib/useProgress";

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

export default function MissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const { progress, missions, ready, expired, saveMission, submitMission, setStuck } =
    useProgress(name);

  useEffect(() => {
    setName(getSavedName());
    setRole(getSavedRole());
    setRestored(true);
  }, []);

  if (!restored) return null;

  if (!name) {
    return (
      <main className="mx-auto max-w-[560px] px-6 py-20">
        <p className="body-lg">
          입장하지 않았습니다. 홈에서 이름과 수업 코드를 넣어 주세요.
        </p>
        <Link href="/" className="btn-primary mt-6">
          홈으로
        </Link>
      </main>
    );
  }

  const mission = missions.find((m) => m.id === id);
  const isGate = GATE_MISSIONS.has(id);

  return (
    <>
      <TopNav
        name={name}
        role={role}
        onLeave={() => {
          clearSession();
          setName(null);
        }}
        notice="제출물에 학생 실명을 적지 마세요"
      />
      <main className="mx-auto max-w-[860px] px-6 pb-32 pt-10">
        <Link href="/" className="link-strong body-sm">
          ← 홈으로
        </Link>

        {!ready ? (
          <p className="body-lg mt-8">불러오는 중입니다.</p>
        ) : !mission ? (
          <p className="body-lg mt-8">없는 미션입니다.</p>
        ) : !mission.open ? (
          <div className="color-block mt-8 bg-blockCream">
            <p className="display-lg">아직 열리지 않은 미션입니다</p>
            <p className="subhead mt-4">
              강사가 열면 홈 스텝퍼의 자물쇠가 풀립니다.
            </p>
          </div>
        ) : (
          <>
            {/* 이 화면의 색 블록은 여기 하나뿐이다. 아래는 흰 캔버스로 돌아간다. */}
            {/* 블록 색은 도구를 가른다. 게이트는 색 대신 표식으로 말한다. */}
            <header className={`color-block mt-8 ${TOOL_TONE[mission.tool ?? "human"]}`}>
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
              <p className="body-lg mt-6">{TOOL_LINE[mission.tool ?? "human"]}</p>
            </header>

            <div className="mt-10 space-y-8">
              <CarryoverPanel carryover={mission.carryover} progress={progress} />

              <div className="md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{mission.guide}</ReactMarkdown>
              </div>

              {mission.promptCard ? (
                <PromptCard
                  key={mission.id}
                  text={buildPromptText(mission, missions, progress)}
                  storageKey={`prompt:${name}:${mission.id}`}
                  filled={Boolean(mission.promptFill)}
                  tool={mission.tool}
                />
              ) : null}

              {mission.id === "m8" ? (
                <PeerToolLinks target={progress?.reviewTarget} />
              ) : null}

              {mission.id === "m9" ? (
                <section className="card">
                  <p className="eyebrow">발표 원고</p>
                  <p className="body-sm mt-4">
                    지금까지 적은 것으로 README 초안을 만들어 둡니다. 열어서 고친 다음
                    저장소에 올리세요.
                  </p>
                  <Link href="/readme" className="btn-primary mt-5">
                    README 초안 열기
                  </Link>
                </section>
              ) : null}

              <MissionForm
                mission={mission}
                progress={progress}
                name={name}
                onSave={(data) => saveMission(mission.id, data)}
                onSubmit={() => submitMission(mission.id)}
              />

              {mission.id === "m5" ? (
                <PeerReviewSection myName={name} target={progress?.reviewTarget} />
              ) : null}
            </div>
          </>
        )}
      </main>
      {/* 잠긴 미션과 없는 미션 화면에는 띄우지 않는다. 물어볼 단계가 아직 없다. */}
      {mission?.open ? (
        <TutorPanel name={name} missionId={mission.id} missionTitle={mission.title} />
      ) : null}
      <StuckButton stuck={progress?.stuck === true} onToggle={(next) => setStuck(next)} />
      {expired ? (
        <ExpiredNotice
          onReenter={() => {
            clearSession();
            setName(null);
          }}
        />
      ) : null}
    </>
  );
}
