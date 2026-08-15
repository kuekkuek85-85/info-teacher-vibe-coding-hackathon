"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [workshopCode, setWorkshopCode] = useState("");
  // 프로젝터로 전환하는 순간 전원의 코드가 새어 나가지 않도록 기본은 가린다.
  const [codesOpen, setCodesOpen] = useState(false);
  const [codesError, setCodesError] = useState<string | null>(null);
  const [codesLoading, setCodesLoading] = useState(false);

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

  // 입장 코드는 실시간 구독 대상이 아니다. 필요할 때 받아 온다.
  // 조회 도중 잠그면 늦게 온 응답이 코드를 되살리므로 세대 번호로 걸러 낸다.
  const codesGeneration = useRef(0);

  const loadCodes = useCallback(async () => {
    if (!pin) return;
    const generation = ++codesGeneration.current;
    const stale = () => generation !== codesGeneration.current;

    setCodesLoading(true);
    setCodesError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "workshopCode", pin }),
      });
      if (stale()) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setCodesError(
          res.status === 401
            ? "PIN이 맞지 않아 코드를 받지 못했습니다. 다시 들어와 주세요."
            : (body?.message ?? "코드를 받지 못했습니다. 다시 불러오기를 눌러 주세요."),
        );
        return;
      }
      const body = await res.json();
      if (stale()) return;
      setWorkshopCode(String(body.code ?? ""));
    } catch {
      if (stale()) return;
      setCodesError("연결하지 못해 코드를 받지 못했습니다. 다시 불러오기를 눌러 주세요.");
    } finally {
      if (!stale()) setCodesLoading(false);
    }
  }, [pin]);

  useEffect(() => {
    if (!authed) {
      // 잠글 때 화면에 남은 코드를 지우고, 돌고 있던 조회의 응답도 버린다.
      codesGeneration.current++;
      setWorkshopCode("");
      setCodesOpen(false);
      setCodesError(null);
      setCodesLoading(false);
      return;
    }
    loadCodes();
  }, [authed, loadCodes]);

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
      <main className="mx-auto max-w-[420px] px-3 py-16">
        <div className="plate p-1">
          <div className="bg-systemsTeal px-5 py-7 text-center">
            <p className="wordmark text-[28px]">운영자 대시보드</p>
          </div>
        </div>
        <div className="plate mt-3">
          <div className="section-bar">
            <span className="bar-glyph" />
            PIN 입력
          </div>
          <form onSubmit={verify} className="plate-inset m-2 space-y-3 p-4">
            <input
              className="text-input"
              type="password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <button className="btn-signal w-full" disabled={busy || !pin}>
              {busy ? "확인하는 중" : "들어가기"}
            </button>
            {error ? (
              <p className="bg-brand px-3 py-2 font-bold text-white">{error}</p>
            ) : null}
          </form>
        </div>
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
    if (!m.open) return { mark: "🔒", label: "잠김", tone: "text-mutedIndigo" };
    const entry = p?.missions?.[m.id];
    if (entry?.status === "submitted")
      return { mark: "✓", label: "제출", tone: "font-bold text-brand" };
    if (entry?.data && Object.values(entry.data).some((v) => v?.trim()))
      return { mark: "◐", label: "작성 중", tone: "font-bold text-ink" };
    return { mark: "·", label: "미시작", tone: "text-inkSoft" };
  };

  return (
    <main className="mx-auto max-w-[1000px] px-3 pb-24 pt-3">
      <div className="slab flex items-center justify-between px-3 py-2">
        <span className="nav-link text-navGold">운영자 대시보드</span>
        <button
          type="button"
          className="btn-amber"
          onClick={() => {
            sessionStorage.removeItem(PIN_KEY);
            setAuthed(false);
          }}
        >
          잠그기
        </button>
      </div>

      {error ? (
        <p className="mt-2 bg-brand px-3 py-2 font-bold text-white">{error}</p>
      ) : null}

      <section className="plate mt-3 p-3">
        <h2 className="chrome-label text-ink">수업 코드</h2>
        <p className="mt-1 text-carbon">
          모두가 같은 코드로 들어옵니다. 칠판에 적거나 화면에 띄워 알려 주세요.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={codesOpen ? "btn-amber" : "btn-signal"}
            onClick={() => setCodesOpen((v) => !v)}
            disabled={!workshopCode && !codesOpen}
          >
            {codesOpen ? "가리기" : "코드 보기"}
          </button>
          {codesError ? (
            <button
              type="button"
              className="btn-amber"
              onClick={loadCodes}
              disabled={codesLoading}
            >
              {codesLoading ? "불러오는 중" : "다시 불러오기"}
            </button>
          ) : null}
        </div>

        {codesError ? (
          <p className="mt-3 bg-brand px-3 py-2 font-bold text-white">{codesError}</p>
        ) : codesLoading && !workshopCode ? (
          <p className="mt-3 text-carbon">불러오는 중입니다.</p>
        ) : null}

        {codesOpen && workshopCode ? (
          <div className="plate-white mt-3 px-6 py-8 text-center">
            <p className="wordmark text-[64px] tracking-[8px] min-[600px]:text-[88px]">
              {workshopCode}
            </p>
          </div>
        ) : null}
      </section>

      <section className="plate mt-3 p-3">
        <h2 className="chrome-label text-ink">미션 열기</h2>
        <div className="mt-2 flex flex-wrap gap-2">
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
              className={m.open ? "btn-signal" : "btn-carbon"}
            >
              {m.id} {m.open ? "열림" : "열기"}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <button
            type="button"
            disabled={busy}
            className="btn-amber"
            onClick={() => {
              if (!confirm("이미 배정된 검토 상대가 바뀝니다. 계속할까요?")) return;
              call("shuffle");
            }}
          >
            동료 검토 셔플 배정
          </button>
        </div>
      </section>

      <section className="plate mt-3 p-3">
        <h2 className="chrome-label text-ink">막혔어요 큐</h2>
        {stuckList.length === 0 ? (
          <p className="mt-2 text-carbon">지금 막힌 사람이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {stuckList.map((p) => (
              <li
                key={p.name}
                className="flex items-center justify-between gap-3 bg-brand px-3 py-2"
                style={{
                  borderTop: "1px solid #ff6b73",
                  borderBottom: "2px solid #8c000b",
                }}
              >
                <span className="font-bold text-white">
                  {p.name} · {p.school}
                </span>
                <button
                  type="button"
                  className="btn-amber"
                  onClick={() => call("resolveStuck", { name: p.name })}
                >
                  해제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="plate mt-3 overflow-x-auto p-3">
        <h2 className="chrome-label text-ink">진행 현황</h2>
        <table className="mt-2 w-full min-w-[620px]">
          <thead>
            <tr className="bg-canvasSoft">
              <th className="chrome-label border border-hairline px-2 py-1 text-left">
                이름
              </th>
              {missions.map((m) => (
                <th
                  key={m.id}
                  className="chrome-label border border-hairline px-1 py-1 text-center"
                >
                  {m.id}
                </th>
              ))}
              <th className="chrome-label border border-hairline px-2 py-1 text-left">
                검토 상대
              </th>
              <th className="chrome-label border border-hairline px-2 py-1 text-right">
                입장
              </th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r) => {
              const p = people[r.name];
              return (
                <tr key={r.name} className="bg-surface">
                  <td className="border border-hairline px-2 py-1 font-bold text-ink">
                    {r.name}
                    {r.role === "staff" ? (
                      <span className="ml-1 micro text-inkSoft">강사</span>
                    ) : null}
                  </td>
                  {missions.map((m) => {
                    const c = cell(p, m);
                    return (
                      <td key={m.id} className="border border-hairline p-0 text-center">
                        <button
                          type="button"
                          className={`flex h-11 w-11 items-center justify-center ${c.tone}`}
                          title={`${r.name} ${m.id} ${c.label}`}
                          aria-label={`${r.name} ${m.id} ${c.label}, 제출물 보기`}
                          onClick={() => setDetail({ name: r.name, mission: m })}
                        >
                          <span aria-hidden="true">{c.mark}</span>
                        </button>
                      </td>
                    );
                  })}
                  <td className="border border-hairline px-2 py-1 text-inkSoft">
                    {p?.reviewTarget ?? "·"}
                  </td>
                  <td className="border border-hairline px-2 py-1 text-right">
                    {p?.ownerUid ? (
                      <button
                        type="button"
                        className="link-bold underline"
                        onClick={() => {
                          if (
                            !confirm(
                              `${r.name} 의 이름을 풉니다. 다른 기기에서 다시 입장할 수 있게 됩니다.`,
                            )
                          )
                            return;
                          call("releaseName", { name: r.name });
                        }}
                      >
                        이름 풀기
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-carbon">
          ✓ 제출, ◐ 작성 중, · 미시작, 🔒 잠김. 학생 {students.length}명, 전체{" "}
          {roster.length}명입니다.
        </p>
      </section>

      <section className="plate mt-3 p-3">
        <h2 className="chrome-label text-ink">발표 순서</h2>
        {deployed.length === 0 ? (
          <p className="mt-2 text-carbon">아직 m7 제출자가 없습니다.</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap gap-2">
              {deployed.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="btn-carbon"
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
            <ol className="plate-inset mt-3 space-y-2 p-3">
              {order.map((n, i) => (
                <li key={n} className="flex items-center gap-2">
                  <span className="font-bold text-inkSoft">{i + 1}</span>
                  <span className="flex-1 font-bold text-ink">{n}</span>
                  <button
                    type="button"
                    className="btn-amber"
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
                    className="btn-amber"
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
                className="btn-signal mt-3"
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
          className="fixed inset-0 z-40 flex items-center justify-center bg-carbon/70 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="plate max-h-[80vh] w-full max-w-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-bar">
              <span className="bar-glyph" />
              {detail.name} · {detail.mission.id} {detail.mission.title}
            </div>
            <dl className="plate-inset m-2 space-y-3 p-3">
              {detail.mission.fields.map((f) => {
                const v = people[detail.name]?.missions?.[detail.mission.id]?.data?.[f.key];
                return (
                  <div key={f.key}>
                    <dt className="chrome-label text-inkSoft">{f.label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-ink">
                      {v?.trim() ? v : "비어 있습니다"}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <button
              type="button"
              className="btn-signal mx-2 mb-3"
              onClick={() => setDetail(null)}
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
