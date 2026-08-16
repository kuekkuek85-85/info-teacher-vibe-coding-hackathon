"use client";

import { useEffect, useState } from "react";
import CaseShowcase from "@/components/CaseShowcase";
import EnterGate from "@/components/EnterGate";
import ExpiredNotice from "@/components/ExpiredNotice";
import MissionDetail from "@/components/MissionDetail";
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
  const [picked, setPicked] = useState<string | null>(null);
  const { progress, missions, ready, expired, saveMission, submitMission, setStuck } =
    useProgress(name);

  // 스텝퍼에서 고른 칸. 아직 안 골랐으면 진행 중인 칸을, 그것도 없으면 열린 첫 칸을 편다.
  const open =
    missions.find((m) => m.open && m.id === picked) ??
    missions.find((m) => m.open && m.id === progress?.currentStep) ??
    missions.find((m) => m.open) ??
    null;

  // 주소에 남겨야 새로고침해도 보던 칸으로 돌아오고, 링크로 그 칸을 가리킬 수 있다.
  const select = (id: string) => {
    setPicked(id);
    window.history.replaceState(null, "", `/?m=${id}`);
  };

  useEffect(() => {
    setName(getSavedName());
    setRole(getSavedRole());
    setRestored(true);

    // 새로고침이나 링크로 들어온 자리를 먼저 본다
    const fromUrl = new URLSearchParams(window.location.search).get("m");
    if (fromUrl) setPicked(fromUrl);

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

  return (
    <>
      <TopNav
        name={name}
        role={role}
        onLeave={leave}
        notice={open ? "제출물에 학생 실명을 적지 마세요" : undefined}
      />
      <main className="mx-auto max-w-[1280px] px-6 pb-32 pt-12">
        <section>
          <p className="eyebrow">파이프라인</p>
          <h1 className="display-lg mt-3">열 칸을 왼쪽부터 밟습니다</h1>
          <p className="body-lg mt-3">
            열린 칸은 언제든 다시 들어가 고칠 수 있습니다.
          </p>
          <div className="mt-8">
            <Stepper
              missions={missions}
              progress={progress}
              selected={open?.id}
              onSelect={select}
            />
          </div>
        </section>

        <section className="mt-12">
          {!ready ? (
            <p className="body-lg">불러오는 중입니다.</p>
          ) : !open ? (
            <div className="color-block bg-blockCream">
              <p className="subhead">
                아직 열린 미션이 없습니다. 강사가 열면 여기에 나타납니다.
              </p>
            </div>
          ) : (
            <MissionDetail
              mission={open}
              missions={missions}
              progress={progress}
              name={name}
              onSave={(data) => saveMission(open.id, data)}
              onSubmit={() => submitMission(open.id)}
            />
          )}
        </section>
      </main>
      {/* 칸을 바꾸면 튜터도 새로 연다. 앞 단계 대화가 남으면 다음 질문에 섞인다. */}
      {open ? (
        <TutorPanel
          key={open.id}
          name={name}
          missionId={open.id}
          missionTitle={open.title}
        />
      ) : null}
      <StuckButton
        stuck={progress?.stuck === true}
        onToggle={(next) => setStuck(next)}
      />

      {casesModal}
      {expired ? <ExpiredNotice onReenter={leave} /> : null}
    </>
  );
}
