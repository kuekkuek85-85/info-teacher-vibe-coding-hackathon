"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { ensureAnonAuth, getDb } from "@/lib/firebase";
import type { Mission, Progress, RosterEntry } from "@/lib/types";

const PIN_KEY = "basecamp:pin";

export default function TeacherPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [people, setPeople] = useState<Record<string, Progress>>({});
  const [missions, setMissions] = useState<Mission[]>([]);
  const [detail, setDetail] = useState<{ name: string; mission: Mission } | null>(null);
  const [order, setOrder] = useState<string[]>([]);

  // 저장된 PIN 이 있어도 서버에 다시 물어본 뒤에 들여보낸다.
  useEffect(() => {
    const saved = sessionStorage.getItem(PIN_KEY);
    if (!saved) return;
    setPin(saved);
    (async () => {
      try {
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", pin: saved }),
        });
        if (res.ok) setAuthed(true);
        else sessionStorage.removeItem(PIN_KEY);
      } catch {
        sessionStorage.removeItem(PIN_KEY);
      }
    })();
  }, []);

  useEffect(() => {
    if (!authed) return;
    let unsubs: (() => void)[] = [];
    let cancelled = false;

    (async () => {
      await ensureAnonAuth();
      if (cancelled) return;
      const db = getDb();
      unsubs.push(
        onSnapshot(collection(db, "roster"), (snap) =>
          setRoster(snap.docs.map((d) => d.data() as RosterEntry)),
        ),
        onSnapshot(collection(db, "progress"), (snap) => {
          const next: Record<string, Progress> = {};
          snap.docs.forEach((d) => (next[d.id] = { ...d.data() } as Progress));
          setPeople(next);
        }),
        onSnapshot(collection(db, "missions"), (snap) =>
          setMissions(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }) as Mission)
              .sort((a, b) => a.order - b.order),
          ),
        ),
      );
    })();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [authed]);

  const call = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, pin, ...payload }),
        });
        if (!res.ok) {
          if (res.status === 401) {
            setError("PIN이 맞지 않습니다. 다시 입력해 주세요.");
            return null;
          }
          // 서버가 원인을 알려 주면 그대로 보여 준다. 설정 문제를 짐작하지 않게.
          const body = await res.json().catch(() => null);
          setError(body?.message ?? "요청을 처리하지 못했습니다. 잠시 뒤 다시 눌러 주세요.");
          return null;
        }
        return await res.json();
      } catch {
        setError("연결하지 못했습니다. 네트워크를 확인해 주세요.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [pin],
  );

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", pin }),
      });
      if (!res.ok) {
        setError("PIN이 맞지 않습니다. 다시 입력해 주세요.");
        return;
      }
      sessionStorage.setItem(PIN_KEY, pin);
      setAuthed(true);
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
        <h1 className="display text-[32px]">운영자 대시보드</h1>
        <form onSubmit={verify} className="mt-8 space-y-3">
          <input
            className="text-input tnum"
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button className="btn-primary w-full" disabled={busy || !pin}>
            {busy ? "확인하는 중" : "들어가기"}
          </button>
        </form>
        {error ? <p className="mt-4 text-sm text-gCoral">{error}</p> : null}
      </main>
    );
  }

  const students = roster.filter((r) => r.role === "student");
  // 오래 기다린 사람이 위로 온다.
  const stuckSeconds = (p: Progress) =>
    (p.stuckAt as { seconds?: number } | undefined)?.seconds ?? Number.MAX_SAFE_INTEGER;
  const stuckList = Object.values(people)
    .filter((p) => p.stuck)
    .sort((a, b) => stuckSeconds(a) - stuckSeconds(b));
  const deployed = Object.values(people).filter(
    (p) => p.missions?.m7?.status === "submitted",
  );

  const cell = (p: Progress | undefined, m: Mission) => {
    if (!m.open) return { mark: "🔒", tone: "text-inkMuted" };
    const entry = p?.missions?.[m.id];
    if (entry?.status === "submitted") return { mark: "✓", tone: "text-success" };
    if (entry?.data && Object.values(entry.data).some((v) => v?.trim()))
      return { mark: "◐", tone: "text-ink" };
    return { mark: "·", tone: "text-inkMuted" };
  };

  return (
    <main className="mx-auto max-w-[1199px] px-5 pb-24 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="display text-[32px]">운영자 대시보드</h1>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            sessionStorage.removeItem(PIN_KEY);
            setAuthed(false);
          }}
        >
          잠그기
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-gCoral">{error}</p> : null}

      <section className="mt-8">
        <h2 className="text-[15px]">미션 열기</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {missions.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={busy}
              onClick={() => {
                if (m.open) {
                  if (!confirm("이 미션을 닫습니다. 비상시에만 사용하세요.")) return;
                  call("closeMission", { missionId: m.id });
                } else {
                  call("openMission", { missionId: m.id });
                }
              }}
              className={m.open ? "btn-primary" : "btn-secondary"}
            >
              {m.id} {m.open ? "열림" : "열기"}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="btn-secondary"
            onClick={() => {
              if (!confirm("이미 배정된 검토 상대가 바뀝니다. 계속할까요?")) return;
              call("shuffle");
            }}
          >
            동료 검토 셔플 배정
          </button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[15px]">막혔어요 큐</h2>
        {stuckList.length === 0 ? (
          <p className="mt-2 text-sm text-inkMuted">지금 막힌 사람이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stuckList.map((p) => (
              <li
                key={p.name}
                className="flex items-center justify-between rounded-[10px] bg-gCoral px-4 py-3"
              >
                <span>
                  {p.name} · {p.school}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => call("resolveStuck", { name: p.name })}
                >
                  해제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 overflow-x-auto">
        <h2 className="text-[15px]">진행 현황</h2>
        <table className="mt-3 w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-inkMuted">
              <th className="border-b border-hairlineSoft py-2 text-left font-medium">
                이름
              </th>
              {missions.map((m) => (
                <th
                  key={m.id}
                  className="border-b border-hairlineSoft py-2 text-center font-medium tnum"
                >
                  {m.id}
                </th>
              ))}
              <th className="border-b border-hairlineSoft py-2 text-left font-medium">
                검토 상대
              </th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r) => {
              const p = people[r.name];
              return (
                <tr key={r.name} className="text-inkMuted">
                  <td className="border-b border-hairlineSoft py-2 text-ink">
                    {r.name}
                    {r.role === "staff" ? (
                      <span className="ml-2 text-[12px] text-inkMuted">강사</span>
                    ) : null}
                  </td>
                  {missions.map((m) => {
                    const c = cell(p, m);
                    return (
                      <td key={m.id} className="border-b border-hairlineSoft py-2 text-center">
                        <button
                          type="button"
                          className={c.tone}
                          onClick={() => setDetail({ name: r.name, mission: m })}
                        >
                          {c.mark}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-b border-hairlineSoft py-2">
                    {p?.reviewTarget ?? "·"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-[13px] text-inkMuted">
          ✓ 제출, ◐ 작성 중, · 미시작, 🔒 잠김. 학생 {students.length}명, 전체{" "}
          {roster.length}명입니다.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[15px]">발표 순서</h2>
        {deployed.length === 0 ? (
          <p className="mt-2 text-sm text-inkMuted">아직 m7 제출자가 없습니다.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {deployed.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setOrder((prev) =>
                      prev.includes(p.name) ? prev : [...prev, p.name],
                    )
                  }
                >
                  {p.name} 추가
                </button>
              ))}
            </div>
            <ol className="mt-4 space-y-2">
              {order.map((n, i) => (
                <li key={n} className="flex items-center gap-3 text-sm">
                  <span className="tnum text-inkMuted">{i + 1}</span>
                  <span className="flex-1">{n}</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setOrder((prev) => {
                        if (i === 0) return prev;
                        const next = [...prev];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        return next;
                      })
                    }
                  >
                    위로
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setOrder((prev) => prev.filter((x) => x !== n))}
                  >
                    빼기
                  </button>
                </li>
              ))}
            </ol>
            {order.length > 0 ? (
              <button
                type="button"
                className="btn-primary mt-4"
                disabled={busy}
                onClick={() => call("setPresentOrder", { names: order })}
              >
                발표 순서 저장
              </button>
            ) : null}
          </>
        )}
      </section>

      {detail ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-5"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-[20px] bg-surface1 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[13px] text-inkMuted">
              {detail.name} · {detail.mission.id} {detail.mission.title}
            </p>
            <dl className="mt-4 space-y-4">
              {detail.mission.fields.map((f) => {
                const v = people[detail.name]?.missions?.[detail.mission.id]?.data?.[f.key];
                return (
                  <div key={f.key}>
                    <dt className="text-[13px] text-inkMuted">{f.label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-[15px]">
                      {v?.trim() ? v : "비어 있습니다"}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <button type="button" className="btn-primary mt-6" onClick={() => setDetail(null)}>
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
