"use client";

import { useEffect, useState } from "react";
import { ensureAnonAuth } from "@/lib/firebase";
import { isPersistent, saveSession } from "@/lib/session";

export default function EnterGate({
  onEntered,
}: {
  onEntered: (name: string, role: string, school: string) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [noStorage, setNoStorage] = useState(false);

  // 저장소를 못 쓰는 브라우저면 새로고침할 때마다 다시 입장해야 한다.
  // 조용히 넘어가면 참가자가 원인을 모른 채 헤맨다.
  useEffect(() => {
    setNoStorage(!isPersistent());
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { idToken } = await ensureAnonAuth();
      const res = await fetch("/api/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), code: code.trim(), idToken }),
      });
      if (!res.ok) {
        if (res.status === 409) {
          const body = await res.json().catch(() => null);
          setError(
            body?.message ??
              "이미 다른 기기에서 쓰고 있는 이름입니다. 본인이 맞으면 강사에게 말씀해 주세요.",
          );
          return;
        }
        setError("이름 또는 수업 코드가 맞지 않습니다. 강사에게 확인해 주세요.");
        return;
      }
      const data = await res.json();
      saveSession(name.trim(), data.role, data.school);
      onEntered(name.trim(), data.role, data.school);
    } catch {
      setError("연결하지 못했습니다. 네트워크를 확인하고 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-[720px] px-6 py-16">
      {/* 흰 캔버스 위의 사설란. 색은 아래 블록 하나만 쓴다. */}
      <p className="eyebrow">2026 정보 교사 바이브 코딩 역량강화 워크숍</p>
      <h1 className="display-xl mt-4">해커톤 베이스캠프</h1>

      <div className="color-block mt-12 bg-blockLime">
        <p className="eyebrow">입장</p>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <label className="block">
            <span className="body-lg link-strong">이름</span>
            <input
              className="text-input mt-2"
              placeholder="명단에 있는 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="body-lg link-strong">수업 코드</span>
            <input
              className="text-input mt-2"
              placeholder="강사가 알려 준 번호"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
            />
          </label>
          <button className="btn-primary w-full" disabled={busy || !name || !code}>
            {busy ? "확인하는 중" : "입장하기"}
          </button>
          {error ? <p className="body-sm link-strong">{error}</p> : null}
          {noStorage ? (
            <p className="body-sm">
              이 브라우저는 저장을 막아 두었습니다. 지금은 들어갈 수 있지만 새로고침하면
              이름과 코드를 다시 넣어야 합니다.
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
