"use client";

import { useEffect, useState } from "react";
import EnterGate from "@/components/EnterGate";
import ExpiredNotice from "@/components/ExpiredNotice";
import MissionCard from "@/components/MissionCard";
import Stepper from "@/components/Stepper";
import StuckButton from "@/components/StuckButton";
import TopNav from "@/components/TopNav";
import { clearSession, getSavedName, getSavedRole } from "@/lib/session";
import { useProgress } from "@/lib/useProgress";

export default function HomePage() {
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const { progress, missions, ready, expired, setStuck } = useProgress(name);

  useEffect(() => {
    setName(getSavedName());
    setRole(getSavedRole());
    setRestored(true);
  }, []);

  if (!restored) return null;

  if (!name) {
    return (
      <EnterGate
        onEntered={(n, r) => {
          setName(n);
          setRole(r);
        }}
      />
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
      <main className="mx-auto max-w-[1199px] px-5 pb-24 pt-6">
        <section>
          <h1 className="display text-[32px]">파이프라인</h1>
          <p className="mt-1 text-sm text-inkMuted">
            열린 칸은 언제든 다시 들어가 고칠 수 있습니다.
          </p>
          <div className="mt-4">
            <Stepper missions={missions} progress={progress} />
          </div>
        </section>

        <section className="mt-10">
          {!ready ? (
            <p className="text-inkMuted">불러오는 중입니다.</p>
          ) : openMissions.length === 0 ? (
            <p className="text-inkMuted">
              아직 열린 미션이 없습니다. 강사가 열면 여기에 나타납니다.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
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
      <StuckButton
        stuck={progress?.stuck === true}
        onToggle={(next) => setStuck(next)}
      />
      {expired ? <ExpiredNotice onReenter={leave} /> : null}
    </>
  );
}
