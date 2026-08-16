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
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="body-lg">발표 순서가 아직 정해지지 않았습니다.</p>
      </main>
    );
  }

  const name = order[Math.min(index, order.length - 1)];
  const p = people[name];
  const m7 = p?.missions?.m7?.data;
  const m8 = p?.missions?.m8?.data;
  const oneline = p?.missions?.m2?.data?.oneline;

  return (
    <main className="mx-auto flex min-h-screen max-w-[1000px] flex-col justify-center px-6 py-12">
      <div className="color-block bg-blockNavy">
        <p className="eyebrow text-inverseInk">
          발표 {index + 1} / {order.length}
        </p>
        <h1 className="display-xl mt-4 text-inverseInk">{name}</h1>
        {oneline ? (
          <p className="subhead mt-6 text-inverseInk">{oneline}</p>
        ) : null}
      </div>

      <div className="mt-10">
        {m7?.deploy_url ? (
          <a
            href={m7.deploy_url}
            target="_blank"
            rel="noreferrer"
            className="link-strong break-all text-[26px] underline"
          >
            {m7.deploy_url}
          </a>
        ) : (
          <p className="body-lg">배포 URL이 아직 없습니다.</p>
        )}
        {m8?.commit_msg ? (
          <p className="body-lg mt-5">커밋 메시지: {m8.commit_msg}</p>
        ) : null}
      </div>

      <div className="mt-10 flex gap-3">
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
