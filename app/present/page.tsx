"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { ensureAnonAuth, getDb } from "@/lib/firebase";
import { safeGithubUrl, safeHttpUrl } from "@/lib/readme";
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
  const repoUrl = safeGithubUrl(m7?.repo_url ?? "");
  const deployUrl = safeHttpUrl(m7?.deploy_url ?? "");

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

      <div className="mt-10 space-y-5">
        {/* 발표는 README 로 한다. 저장소를 먼저 놓는다.
            참가자가 적은 주소를 그대로 열지 않고 깃허브인지 확인한다. */}
        {repoUrl ? (
          <p>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="link-strong break-all text-[26px] underline"
            >
              {repoUrl}
            </a>
            {p?.readmePushed ? (
              <span className="caption ml-4">README 올림</span>
            ) : null}
          </p>
        ) : m7?.repo_url ? (
          <p className="body-lg">
            저장소 주소가 깃허브가 아닙니다. 발표자에게 직접 확인해 주세요.
          </p>
        ) : (
          <p className="body-lg">저장소 주소가 아직 없습니다.</p>
        )}

        {deployUrl ? (
          <p>
            <a
              href={deployUrl}
              target="_blank"
              rel="noreferrer"
              className="link-strong break-all text-[22px] underline"
            >
              {deployUrl}
            </a>
          </p>
        ) : null}

        {m8?.commit_msg ? (
          <p className="body-lg">커밋 메시지: {m8.commit_msg}</p>
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
