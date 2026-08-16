"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ExpiredNotice from "@/components/ExpiredNotice";
import MissionDetail from "@/components/MissionDetail";
import StuckButton from "@/components/StuckButton";
import TutorPanel from "@/components/TutorPanel";
import TopNav from "@/components/TopNav";
import { clearSession, getSavedName, getSavedRole } from "@/lib/session";
import { useProgress } from "@/lib/useProgress";

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
        action={
          <StuckButton stuck={progress?.stuck === true} onToggle={(next) => setStuck(next)} />
        }
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
          <div className="mt-8">
            <MissionDetail
              mission={mission}
              missions={missions}
              progress={progress}
              name={name}
              onSave={(data) => saveMission(mission.id, data)}
              onSubmit={() => submitMission(mission.id)}
            />
          </div>
        )}
      </main>
      {/* 잠긴 미션과 없는 미션 화면에는 띄우지 않는다. 물어볼 단계가 아직 없다. */}
      {mission?.open ? (
        <TutorPanel name={name} missionId={mission.id} missionTitle={mission.title} />
      ) : null}
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
