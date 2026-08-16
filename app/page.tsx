"use client";

import { useEffect, useState } from "react";
import CaseShowcase from "@/components/CaseShowcase";
import EnterGate from "@/components/EnterGate";
import ExpiredNotice from "@/components/ExpiredNotice";
import MissionCard from "@/components/MissionCard";
import Modal from "@/components/Modal";
import Stepper from "@/components/Stepper";
import StuckButton from "@/components/StuckButton";
import TutorPanel from "@/components/TutorPanel";
import TopNav from "@/components/TopNav";
import {
  clearSession,
  getSavedName,
  getSavedRole,
  hasSeenCases,
  markCasesSeen,
} from "@/lib/session";
import { useProgress } from "@/lib/useProgress";

/**
 * 접속하자마자 수업 사례를 띄울지. 1일차 오후 소개에 쓰고 껐다.
 * 다시 띄우려면 true 로 바꾸고, 이미 닫은 사람에게도 보여야 하면
 * lib/session.ts 의 casesSeen 키 판을 올린다.
 */
const SHOW_CASES_POPUP = false;

export default function HomePage() {
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [casesOpen, setCasesOpen] = useState(false);
  const { progress, missions, ready, expired, setStuck } = useProgress(name);

  useEffect(() => {
    setName(getSavedName());
    setRole(getSavedRole());
    setRestored(true);

    // 사례 팝업은 1일차 오후 소개용이었다. 2일차에는 미션에 바로 들어가야 해서 끈다.
    // 내용은 그대로 있다. 상단 메뉴의 수업 사례나 /cases 에서 볼 수 있다.
    if (SHOW_CASES_POPUP && !hasSeenCases()) setCasesOpen(true);
  }, []);

  const closeCases = () => {
    setCasesOpen(false);
    markCasesSeen();
  };

  // 사례 팝업. 입장 전후 어느 화면에서든 같은 모양으로 뜬다.
  const casesModal =
    casesOpen && !expired ? (
      <Modal title="바이브 코딩 수업 적용 사례" onClose={closeCases} wide>
        <CaseShowcase headingLevel="h2" onClose={closeCases} />
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button type="button" className="btn-secondary" onClick={closeCases}>
            닫고 시작하기
          </button>
          <span className="body-sm">상단 메뉴의 수업 사례에서 다시 볼 수 있습니다</span>
        </div>
      </Modal>
    ) : null;

  if (!restored) return null;

  // 참가자는 입장 화면을 먼저 본다. 여기서 안 띄우면 사례를 못 보고 지나간다.
  if (!name) {
    return (
      <>
        <EnterGate
          onEntered={(n, r) => {
            setName(n);
            setRole(r);
          }}
        />
        {casesModal}
      </>
    );
  }

  const leave = () => {
    clearSession();
    setName(null);
    setRole(null);
  };

  const openMissions = missions.filter((m) => m.open);

  return (
    <>
      <TopNav name={name} role={role} onLeave={leave} />
      <main className="mx-auto max-w-[1280px] px-6 pb-32 pt-12">
        <section>
          <p className="eyebrow">파이프라인</p>
          <h1 className="display-lg mt-3">열 칸을 왼쪽부터 밟습니다</h1>
          <p className="body-lg mt-3">
            열린 칸은 언제든 다시 들어가 고칠 수 있습니다.
          </p>
          <div className="mt-8">
            <Stepper missions={missions} progress={progress} />
          </div>
        </section>

        <section className="mt-16">
          {!ready ? (
            <p className="body-lg">불러오는 중입니다.</p>
          ) : openMissions.length === 0 ? (
            <div className="color-block bg-blockCream">
              <p className="subhead">
                아직 열린 미션이 없습니다. 강사가 열면 여기에 나타납니다.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {openMissions.map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  entry={progress?.missions?.[m.id]}
                  isCurrent={progress?.currentStep === m.id}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      {/* 지금 밟고 있는 단계를 물어볼 수 있게 홈에도 둔다. */}
      <TutorPanel name={name} missionId={progress?.currentStep} />
      <StuckButton
        stuck={progress?.stuck === true}
        onToggle={(next) => setStuck(next)}
      />

      {casesModal}
      {expired ? <ExpiredNotice onReenter={leave} /> : null}
    </>
  );
}
