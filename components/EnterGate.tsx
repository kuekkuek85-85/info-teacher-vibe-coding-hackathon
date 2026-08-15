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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <h1 className="display text-5xl">해커톤 베이스캠프</h1>
      <p className="mt-3 text-inkMuted">2026 정보 교사 바이브 코딩 역량강화 워크숍</p>

      <form onSubmit={submit} className="mt-10 space-y-3">
        <input
          className="text-input"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
        <input
          className="text-input tnum"
          placeholder="수업 코드"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
        />
        <button className="btn-primary w-full" disabled={busy || !name || !code}>
          {busy ? "확인하는 중" : "입장하기"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-gCoral">{error}</p> : null}
    </main>
  );
}
