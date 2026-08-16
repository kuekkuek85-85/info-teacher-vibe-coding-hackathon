"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * 1.5초 디바운스 자동 저장.
 * 저장 중 새 입력이 들어오면 완료 후에도 로컬 보관분을 지우지 않는다.
 * flush 는 저장 성공 여부를 돌려주므로 제출이 실패를 알아챌 수 있다.
 */
export function useDebouncedSave(
  name: string | null,
  missionId: string,
  save: (data: Record<string, string>) => Promise<void>,
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<Record<string, string> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const key = `draft:${name ?? "?"}:${missionId}`;

  const run = useCallback(async (): Promise<boolean> => {
    const snapshot = pending.current;
    if (!snapshot) return true;
    setStatus("saving");
    try {
      await saveRef.current(snapshot);
      if (pending.current === snapshot) {
        pending.current = null;
        try {
          localStorage.removeItem(key);
        } catch {
          // 저장소를 못 써도 서버에는 이미 저장됐다. 오류로 처리하지 않는다.
        }
      }
      setStatus("saved");
      setSavedAt(
        new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  }, [key]);

  const queue = useCallback(
    (data: Record<string, string>) => {
      pending.current = data;
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // 저장 공간이 없어도 서버 저장은 계속 시도한다
      }
      clearTimeout(timer.current);
      timer.current = setTimeout(run, 1500);
    },
    [key, run],
  );

  const flush = useCallback((): Promise<boolean> => {
    clearTimeout(timer.current);
    return run();
  }, [run]);

  useEffect(() => {
    const retry = () => {
      if (pending.current) run();
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [run]);

  // 화면에서 사라질 때 기다리던 저장을 흘려보낸다.
  // 홈에서 칸을 바꾸면 페이지 이동이 없어 이 자리가 마지막 기회다.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current) void run();
    },
    [run],
  );

  /** 저장 실패로 남아 있던 초안을 읽는다. */
  const readBackup = useCallback((): Record<string, string> | null => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Record<string, string>) : null;
    } catch {
      return null;
    }
  }, [key]);

  return { status, savedAt, queue, flush, readBackup };
}
