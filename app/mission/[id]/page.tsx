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
      <main className="mx-auto max-w-[420px] px-3 py-16">
        <div className="plate p-4">
          <p className="text-ink">
            입장하지 않았습니다. 홈에서 이름과 수업 코드를 넣어 주세요.
          </p>
          <Link href="/" className="btn-signal mt-4">
            홈으로
          </Link>
        </div>
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
      <main className="mx-auto max-w-[820px] px-3 pb-24 pt-3">
        <Link href="/" className="link-bold">
          ← 홈으로
        </Link>

        {!ready ? (
          <p className="plate mt-3 p-3 text-carbon">불러오는 중입니다.</p>
        ) : !mission ? (
          <p className="plate mt-3 p-3 text-carbon">없는 미션입니다.</p>
        ) : !mission.open ? (
          <div className="plate mt-3 p-6 text-center">
            <p className="wordmark-sm text-[24px]">아직 열리지 않은 미션입니다</p>
            <p className="mt-3 text-carbon">
              강사가 열면 홈 스텝퍼의 자물쇠가 풀립니다.
            </p>
          </div>
        ) : (
          <>
            <header className="plate mt-3 p-1">
              <div
                className={`px-5 py-7 ${isGate ? "bg-gamesRed" : "bg-lavender"}`}
              >
                <p
                  className={`chrome-label ${isGate ? "text-white" : "text-carbon"}`}
                >
                  {mission.id} · {mission.stepLabel} · {mission.session}
                </p>
                <p className="wordmark mt-2 text-[30px]">{mission.title}</p>
              </div>
            </header>

            <div className="mt-3 space-y-3">
              <CarryoverPanel carryover={mission.carryover} progress={progress} />

              <div className="plate md bg-surface p-3 text-ink">
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
