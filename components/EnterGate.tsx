"use client";

import { useState } from "react";
import { ensureAnonAuth } from "@/lib/firebase";
import { saveSession } from "@/lib/session";

export default function EnterGate({
  onEntered,
}: {
  onEntered: (name: string, role: string, school: string) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <main className="mx-auto max-w-[560px] px-3 py-10">
      {/* 히어로 판. 라벤더 필드 위에 외곽선 워드마크가 올라간다. */}
      <div className="plate p-1">
        <div className="bg-lavender px-6 py-10 text-center">
          <p className="wordmark text-[40px]">해커톤 베이스캠프</p>
          <p className="mt-3 font-bold text-carbon">
            2026 정보 교사 바이브 코딩 역량강화 워크숍
          </p>
        </div>
      </div>

      <div className="plate mt-4">
        <div className="section-bar">
          <span className="bar-glyph" />
          입장
        </div>
        <form onSubmit={submit} className="plate-inset m-2 space-y-3 p-4">
          <label className="block">
            <span className="link-bold">이름</span>
            <input
              className="text-input mt-1"
              placeholder="명단에 있는 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="link-bold">수업 코드</span>
            <input
              className="text-input mt-1"
              placeholder="강사가 알려 준 번호"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
            />
          </label>
          <button className="btn-signal w-full" disabled={busy || !name || !code}>
            {busy ? "확인하는 중" : "입장하기"}
          </button>
          {error ? (
            <p className="bg-brand px-3 py-2 font-bold text-white">{error}</p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
