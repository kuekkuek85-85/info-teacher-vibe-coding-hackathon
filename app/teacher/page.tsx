"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import Modal from "@/components/Modal";
import { ensureAnonAuth, getDb } from "@/lib/firebase";
import { readmeOrder, readmeRanks } from "@/lib/readmeOrder";
import type { Mission, Progress, RosterEntry } from "@/lib/types";

const PIN_KEY = "basecamp:pin";

// 저장소가 막힌 브라우저에서도 대시보드는 열려야 한다. PIN 을 기억하지 못할 뿐이다.
function readPin(): string | null {
  try {
    return sessionStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}
function writePin(value: string) {
  try {
    sessionStorage.setItem(PIN_KEY, value);
  } catch {
    // 이번 화면에서만 유지된다
  }
}
function clearPin() {
  try {
    sessionStorage.removeItem(PIN_KEY);
  } catch {
    // 지우지 못해도 화면은 잠긴다
  }
}

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
    const saved = readPin();
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
        else clearPin();
      } catch {
        clearPin();
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
      writePin(pin);
      setAuthed(true);
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <main className="mx-auto max-w-[560px] px-6 py-20">
        <p className="eyebrow">운영자</p>
        <h1 className="display-lg mt-3">대시보드</h1>

        <div className="color-block mt-10 bg-blockNavy">
          <p className="eyebrow text-inverseInk">PIN 입력</p>
          <form onSubmit={verify} className="mt-6 space-y-4">
            <input
              className="text-input"
              type="password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <button className="btn-on-block w-full" disabled={busy || !pin}>
              {busy ? "확인하는 중" : "들어가기"}
            </button>
            {error ? (
              <p className="body-sm link-strong text-inverseInk">{error}</p>
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
  // README 를 올린 순서가 곧 발표 순서다.
  const readmeReady = readmeOrder(Object.values(people));
  const readmeRank = readmeRanks(Object.values(people));

  const cell = (p: Progress | undefined, m: Mission) => {
    // 회색 글자를 만들지 않는다. 굵기와 표면으로 상태를 구분한다.
    if (!m.open) return { mark: "🔒", label: "잠김", tone: "bg-hairlineSoft" };
    const entry = p?.missions?.[m.id];
    if (entry?.status === "submitted")
      return { mark: "✓", label: "제출", tone: "bg-ink text-canvas" };
    if (entry?.data && Object.values(entry.data).some((v) => v?.trim()))
      return { mark: "◐", label: "작성 중", tone: "bg-blockLilac" };
    return { mark: "·", label: "미시작", tone: "" };
  };

  return (
    <main className="mx-auto max-w-[1280px] px-6 pb-32 pt-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">운영자</p>
          <h1 className="display-lg mt-2">대시보드</h1>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            clearPin();
            setAuthed(false);
          }}
        >
          잠그기
        </button>
      </div>

      {error ? <p className="body-sm link-strong mt-4">{error}</p> : null}

      <section className="mt-12">
        <p className="eyebrow">수업 코드</p>
        <p className="body-lg mt-3">
          모두가 같은 코드로 들어옵니다. 칠판에 적거나 화면에 띄워 알려 주세요.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={codesOpen ? "btn-secondary" : "btn-primary"}
            onClick={() => setCodesOpen((v) => !v)}
            disabled={!workshopCode && !codesOpen}
          >
            {codesOpen ? "가리기" : "코드 보기"}
          </button>
          {codesError ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={loadCodes}
              disabled={codesLoading}
            >
              {codesLoading ? "불러오는 중" : "다시 불러오기"}
            </button>
          ) : null}
        </div>

        {codesError ? (
          <p className="body-sm link-strong mt-4">{codesError}</p>
        ) : codesLoading && !workshopCode ? (
          <p className="body-sm mt-4">불러오는 중입니다.</p>
        ) : null}

        {codesOpen && workshopCode ? (
          <div className="color-block mt-6 bg-blockLime text-center">
            <p className="display-xl" style={{ letterSpacing: "0.04em" }}>
              {workshopCode}
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-16">
        <p className="eyebrow">미션 열기</p>
        <div className="mt-4 flex flex-wrap gap-3">
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
              // 여덟 개가 나란히 서는 자리다. 검정 채움은 주요 동작 하나에만 쓰고,
              // 열림과 닫힘은 표면(라임 칩과 흰 알약)으로 구분한다.
              className={
                m.open
                  ? "btn-secondary bg-blockLime"
                  : "btn-secondary"
              }
            >
              {m.id} {m.open ? "열림" : "열기"}
            </button>
          ))}
        </div>
        <div className="mt-5">
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

      <section className="mt-16">
        <p className="eyebrow">막혔어요 큐</p>
        {stuckList.length === 0 ? (
          <p className="body-lg mt-4">지금 막힌 사람이 없습니다.</p>
        ) : (
          // 색 블록은 목록 전체를 감싸는 하나다. 사람마다 판을 반복하지 않는다.
          <div className="color-block mt-4 bg-blockPink">
            <ul className="space-y-4">
              {stuckList.map((p) => (
                <li
                  key={p.name}
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <span className="card-title">
                    {p.name} · {p.school}
                  </span>
                  <button
                    type="button"
                    className="btn-on-block"
                    onClick={() => call("resolveStuck", { name: p.name })}
                  >
                    해제
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-16 overflow-x-auto">
        <p className="eyebrow">진행 현황</p>
        <table className="mt-4 w-full min-w-[720px]">
          <thead>
            <tr>
              <th className="caption border-b border-hairline px-2 py-3 text-left">
                이름
              </th>
              {missions.map((m) => (
                <th
                  key={m.id}
                  className="caption border-b border-hairline px-1 py-3 text-center"
                >
                  {m.id}
                </th>
              ))}
              <th className="caption border-b border-hairline px-2 py-3 text-left">
                검토 상대
              </th>
              <th className="caption border-b border-hairline px-2 py-3 text-center">
                README
              </th>
              <th className="caption border-b border-hairline px-2 py-3 text-right">
                입장
              </th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r) => {
              const p = people[r.name];
              return (
                <tr key={r.name}>
                  <td className="body-sm link-strong border-b border-hairlineSoft px-2 py-1">
                    {r.name}
                    {r.role === "staff" ? (
                      <span className="caption ml-2">강사</span>
                    ) : null}
                  </td>
                  {missions.map((m) => {
                    const c = cell(p, m);
                    return (
                      <td
                        key={m.id}
                        className="border-b border-hairlineSoft p-0 text-center"
                      >
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
                  <td className="body-sm border-b border-hairlineSoft px-2 py-1">
                    {p?.reviewTarget ?? "·"}
                  </td>
                  <td className="body-sm border-b border-hairlineSoft px-2 py-1 text-center">
                    {p?.readmePushed ? (
                      <span
                        className="link-strong whitespace-nowrap"
                        title={
                          readmeRank.has(r.name)
                            ? `README 를 ${readmeRank.get(r.name)}번째로 올렸습니다`
                            : "README 를 올렸습니다"
                        }
                      >
                        ✓
                        {readmeRank.has(r.name) ? (
                          <span className="caption ml-1">{readmeRank.get(r.name)}</span>
                        ) : null}
                      </span>
                    ) : (
                      "·"
                    )}
                  </td>
                  <td className="border-b border-hairlineSoft px-2 py-1 text-right">
                    {p?.ownerUid ? (
                      <button
                        type="button"
                        className="link-strong body-sm underline"
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
        <p className="body-sm mt-4">
          ✓ 제출, ◐ 작성 중, · 미시작, 🔒 잠김. 학생 {students.length}명, 전체{" "}
          {roster.length}명입니다.
        </p>
      </section>

      <section className="mt-16">
        <p className="eyebrow">발표 순서</p>
        {deployed.length === 0 && readmeReady.length === 0 ? (
          <p className="body-lg mt-4">아직 m7 제출자도 README 를 올린 사람도 없습니다.</p>
        ) : (
          <>
            <p className="body-sm mt-4">
              README 를 올린 순서로 채운 다음 손으로 고칠 수 있습니다. 표의 README 칸에
              적힌 숫자가 그 순서입니다.
            </p>
            <button
              type="button"
              className="btn-secondary mt-4"
              disabled={readmeReady.length === 0}
              onClick={() => setOrder(readmeReady)}
            >
              README 순서로 채우기
            </button>
            <div className="mt-4 flex flex-wrap gap-3">
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
            <ol className="mt-6 space-y-3">
              {order.map((n, i) => (
                <li key={n} className="flex flex-wrap items-center gap-3">
                  <span className="caption">{i + 1}</span>
                  <span className="body-lg link-strong flex-1">{n}</span>
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
                className="btn-primary mt-6"
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
        <Modal
          title={`${detail.name} ${detail.mission.id} 제출물`}
          onClose={() => setDetail(null)}
        >
          <p className="eyebrow">
            {detail.name} · {detail.mission.id} {detail.mission.title}
          </p>
          <dl className="mt-6 space-y-5">
            {detail.mission.fields.map((f) => {
              const v = people[detail.name]?.missions?.[detail.mission.id]?.data?.[f.key];
              return (
                <div key={f.key}>
                  <dt className="caption">{f.label}</dt>
                  <dd className="mt-2 whitespace-pre-wrap">
                    {v?.trim() ? v : "비어 있습니다"}
                  </dd>
                </div>
              );
            })}
          </dl>
          <button
            type="button"
            className="btn-primary mt-8"
            onClick={() => setDetail(null)}
          >
            닫기
          </button>
        </Modal>
      ) : null}
    </main>
  );
}
