"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { ensureAnonAuth, getDb } from "@/lib/firebase";
import type { Progress } from "@/lib/types";

export default function PresentPage() {
  const [order, setOrder] = useState<string[]>([]);
  const [people, setPeople] = useState<Record<string, Progress>>({});
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    let cancelled = false;
    (async () => {
      await ensureAnonAuth();
      if (cancelled) return;
      const db = getDb();
      unsubs.push(
        onSnapshot(doc(db, "config", "global"), (snap) =>
          setOrder((snap.data()?.presentOrder ?? []) as string[]),
        ),
        onSnapshot(collection(db, "progress"), (snap) => {
          const next: Record<string, Progress> = {};
          snap.docs.forEach((d) => (next[d.id] = { ...d.data() } as Progress));
          setPeople(next);
        }),
      );
    })();
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, order.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order.length]);

  if (order.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <p className="text-inkMuted">발표 순서가 아직 정해지지 않았습니다.</p>
      </main>
    );
  }

  const name = order[Math.min(index, order.length - 1)];
  const p = people[name];
  const m7 = p?.missions?.m7?.data;
  const m8 = p?.missions?.m8?.data;
  const oneline = p?.missions?.m2?.data?.oneline;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-8 py-12">
      <p className="tnum text-[13px] text-inkMuted">
        발표 {index + 1} / {order.length}
      </p>
      <h1 className="display mt-3 text-6xl">{name}</h1>
      {oneline ? <p className="mt-5 text-2xl text-inkMuted">{oneline}</p> : null}

      {m7?.deploy_url ? (
        <a
          href={m7.deploy_url}
          target="_blank"
          rel="noreferrer"
          className="mt-10 break-all text-3xl text-accentBlue"
        >
          {m7.deploy_url}
        </a>
      ) : (
        <p className="mt-10 text-inkMuted">배포 URL이 아직 없습니다.</p>
      )}

      {m8?.commit_msg ? (
        <p className="mt-8 text-lg text-inkMuted">커밋 메시지: {m8.commit_msg}</p>
      ) : null}

      <div className="mt-14 flex gap-3">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
        >
          이전
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setIndex((i) => Math.min(i + 1, order.length - 1))}
        >
          다음
        </button>
      </div>
    </main>
  );
}
