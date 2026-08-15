"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CarryoverPanel from "@/components/CarryoverPanel";
import ExpiredNotice from "@/components/ExpiredNotice";
import MissionForm from "@/components/MissionForm";
import PeerReviewSection from "@/components/PeerReviewSection";
import PromptCard from "@/components/PromptCard";
import StuckButton from "@/components/StuckButton";
import TopNav from "@/components/TopNav";
import { clearSession, getSavedName, getSavedRole } from "@/lib/session";
import { useProgress } from "@/lib/useProgress";

const GATE_MISSIONS = new Set(["m5", "m8"]);

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
      <main className="mx-auto max-w-md px-5 py-20">
        <p className="text-inkMuted">
          입장하지 않았습니다. 홈에서 이름과 입장 코드를 넣어 주세요.
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
      />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-6">
        <Link href="/" className="text-[13px] text-inkMuted hover:text-ink">
          ← 홈으로
        </Link>

        {/* 작성 중에도 계속 보여야 한다. PRD 5장의 고정 노출 요구사항이다. */}
        <p className="sticky top-14 z-10 -mx-5 bg-canvas px-5 py-2 text-[13px] text-inkMuted">
          제출물에 학생 실명을 적지 마세요.
        </p>

        {!ready ? (
          <p className="mt-6 text-inkMuted">불러오는 중입니다.</p>
        ) : !mission ? (
          <p className="mt-6 text-inkMuted">없는 미션입니다.</p>
        ) : !mission.open ? (
          <div className="mt-6">
            <h1 className="display text-[32px]">아직 열리지 않은 미션입니다</h1>
            <p className="mt-3 text-inkMuted">
              강사가 열면 홈 스텝퍼의 자물쇠가 풀립니다.
            </p>
          </div>
        ) : (
          <>
            <header
              className={
                isGate
                  ? "mt-6 rounded-[20px] bg-gradient-to-br from-gMagenta to-gViolet p-6"
                  : "mt-6"
              }
            >
              <p className="text-[13px] text-inkMuted">
                {mission.stepLabel} · {mission.session}
              </p>
              <h1 className="display mt-2 text-[32px]">
                {mission.id} {mission.title}
              </h1>
            </header>

            <div className="mt-6 space-y-6">
              <CarryoverPanel carryover={mission.carryover} progress={progress} />

              <div className="md text-[15px] text-inkMuted">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{mission.guide}</ReactMarkdown>
              </div>

              {mission.promptCard ? <PromptCard text={mission.promptCard} /> : null}

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
