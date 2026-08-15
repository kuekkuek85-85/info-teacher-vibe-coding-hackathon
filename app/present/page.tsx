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
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="plate p-4 text-carbon">발표 순서가 아직 정해지지 않았습니다.</p>
      </main>
    );
  }

  const name = order[Math.min(index, order.length - 1)];
  const p = people[name];
  const m7 = p?.missions?.m7?.data;
  const m8 = p?.missions?.m8?.data;
  const oneline = p?.missions?.m2?.data?.oneline;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-10">
      <div className="plate p-1">
        <div className="bg-gamesRed px-6 py-8">
          <p className="chrome-label text-white">
            발표 {index + 1} / {order.length}
          </p>
          <p className="wordmark mt-2 text-[56px]">{name}</p>
          {oneline ? (
            <p className="mt-4 text-[15px] font-bold text-white">{oneline}</p>
          ) : null}
        </div>
      </div>

      <div className="plate mt-3 p-4">
        {m7?.deploy_url ? (
          <a
            href={m7.deploy_url}
            target="_blank"
            rel="noreferrer"
            className="link-bold break-all text-[22px]"
          >
            {m7.deploy_url} ▶
          </a>
        ) : (
          <p className="text-carbon">배포 URL이 아직 없습니다.</p>
        )}
        {m8?.commit_msg ? (
          <p className="mt-4 text-carbon">커밋 메시지: {m8.commit_msg}</p>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn-carbon"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
        >
          ◀ 이전
        </button>
        <button
          type="button"
          className="btn-signal"
          onClick={() => setIndex((i) => Math.min(i + 1, order.length - 1))}
        >
          다음 ▶
        </button>
      </div>
    </main>
  );
}
