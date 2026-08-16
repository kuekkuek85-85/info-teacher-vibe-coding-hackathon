"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ensureAnonAuth, getDb } from "./firebase";
import type { Mission, Progress } from "./types";

/** 내 progress 와 미션 목록을 실시간으로 구독한다. */
/** Firestore 권한 거부는 다른 기기에서 다시 입장했다는 뜻이다. */
function isPermissionDenied(e: unknown): boolean {
  return (e as { code?: string })?.code === "permission-denied";
}

export function useProgress(name: string | null) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let unsubMissions: (() => void) | undefined;
    let unsubProgress: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      await ensureAnonAuth();
      if (cancelled) return;
      const db = getDb();

      unsubMissions = onSnapshot(collection(db, "missions"), (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Mission)
          .sort((a, b) => a.order - b.order);
        setMissions(list);
        setReady(true);
      });

      if (name) {
        unsubProgress = onSnapshot(doc(db, "progress", name), (snap) => {
          setProgress(snap.exists() ? ({ ...snap.data() } as Progress) : null);
        });
      }
    })();

    return () => {
      cancelled = true;
      unsubMissions?.();
      unsubProgress?.();
    };
  }, [name]);

  /** 미션 하나의 입력값 전체를 저장한다. 실패하면 예외를 던진다. */
  const saveMission = async (missionId: string, data: Record<string, string>) => {
    if (!name) throw new Error("이름이 없습니다");
    const current = progress?.missions?.[missionId];
    try {
      await updateDoc(doc(getDb(), "progress", name), {
        [`missions.${missionId}.data`]: data,
        [`missions.${missionId}.status`]: current?.status === "submitted" ? "submitted" : "draft",
        [`missions.${missionId}.updatedAt`]: serverTimestamp(),
      });
    } catch (e) {
      if (isPermissionDenied(e)) setExpired(true);
      throw e;
    }
  };

  /** 제출 표시와 현재 스텝 갱신. */
  const submitMission = async (missionId: string) => {
    if (!name) throw new Error("이름이 없습니다");
    const submitted = new Set(
      Object.entries(progress?.missions ?? {})
        .filter(([, v]) => v.status === "submitted")
        .map(([k]) => k),
    );
    submitted.add(missionId);

    const ordered = [...missions].sort((a, b) => a.order - b.order);
    const lastSubmitted = ordered.filter((m) => submitted.has(m.id)).pop();
    const next = lastSubmitted
      ? (ordered.find((m) => m.order > lastSubmitted.order)?.id ?? lastSubmitted.id)
      : ordered[0]?.id;

    try {
      await updateDoc(doc(getDb(), "progress", name), {
        [`missions.${missionId}.status`]: "submitted",
        [`missions.${missionId}.updatedAt`]: serverTimestamp(),
        currentStep: next ?? missionId,
      });
    } catch (e) {
      if (isPermissionDenied(e)) setExpired(true);
      throw e;
    }
  };

  /** 발표용 README 초안을 저장한다. */
  const saveReadme = async (text: string) => {
    if (!name) throw new Error("이름이 없습니다");
    try {
      await updateDoc(doc(getDb(), "progress", name), { readmeDraft: text });
    } catch (e) {
      if (isPermissionDenied(e)) setExpired(true);
      throw e;
    }
  };

  /** 저장소에 README 를 올렸는지 표시한다. 실패하면 부르는 쪽이 알아야 한다. */
  const setReadmePushed = async (pushed: boolean) => {
    if (!name) throw new Error("이름이 없습니다");
    try {
      await updateDoc(doc(getDb(), "progress", name), { readmePushed: pushed });
    } catch (e) {
      if (isPermissionDenied(e)) setExpired(true);
      throw e;
    }
  };

  const setStuck = async (stuck: boolean) => {
    if (!name) return;
    try {
      await updateDoc(doc(getDb(), "progress", name), {
        stuck,
        stuckAt: stuck ? serverTimestamp() : null,
      });
    } catch (e) {
      if (isPermissionDenied(e)) setExpired(true);
    }
  };

  return {
    progress,
    missions,
    ready,
    expired,
    saveMission,
    submitMission,
    saveReadme,
    setReadmePushed,
    setStuck,
  };
}
