"use client";

import { useEffect, useRef, useState } from "react";
import { ensureAnonAuth } from "@/lib/firebase";
import { MAX_TURN_CHARS, type TutorTurn } from "@/lib/tutor";

/**
 * 단계마다 떠 있는 조교. 지금 보고 있는 미션을 서버가 읽어 함께 넘긴다.
 * 대화는 이 화면에만 있고 저장하지 않는다. 제출물이 아니다.
 */
export default function TutorPanel({
  name,
  missionId,
  missionTitle,
}: {
  name?: string | null;
  missionId?: string;
  missionTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<TutorTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // 새 말이 오면 아래를 보여 준다
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, sending]);

  // 닫으면 눌렀던 버튼으로 돌아간다. Escape 로 닫아도 마찬가지다.
  useEffect(() => {
    if (wasOpen.current && !open) openerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const close = () => setOpen(false);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (text.length > MAX_TURN_CHARS) {
      setError(`한 번에 ${MAX_TURN_CHARS}자까지 보낼 수 있습니다.`);
      return;
    }
    const next: TutorTurn[] = [...turns, { role: "user", text }];
    setTurns(next);
    setDraft("");
    setError(null);
    setSending(true);
    try {
      // 이름만 보내면 남의 이름을 대고 쓸 수 있다. 입장 토큰을 함께 보낸다.
      const { idToken } = await ensureAnonAuth();
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ name, missionId, turns: next }),
      });
      const data = (await res.json()) as { ok?: boolean; reply?: string; message?: string };
      if (!res.ok || !data.ok || !data.reply) {
        setError(data.message ?? "답을 받지 못했습니다. 잠시 뒤 다시 보내 주세요.");
        return;
      }
      setTurns((prev) => [...prev, { role: "model", text: data.reply as string }]);
    } catch {
      setError("연결하지 못했습니다. 잠시 뒤 다시 보내 주세요.");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary fixed bottom-6 right-6 z-30"
      >
        AI 튜터
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="AI 튜터"
      className="card fixed bottom-6 right-6 z-40 flex flex-col"
      style={{
        width: "min(380px, calc(100vw - 32px))",
        maxHeight: "min(70vh, 560px)",
        padding: 20,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">AI 튜터</p>
          {missionTitle ? <p className="caption mt-1">{missionTitle}</p> : null}
        </div>
        <button type="button" onClick={close} className="btn-secondary">
          닫기
        </button>
      </div>

      <div ref={threadRef} className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {turns.length === 0 ? (
          <p className="body-sm">
            이 단계에서 막힌 것을 물어보세요. 무엇을 적어야 할지 모르겠을 때도 괜찮습니다.
            답을 대신 정해 주지는 않습니다.
          </p>
        ) : (
          turns.map((t, i) => (
            // 색 블록은 이 화면에 이미 하나 있다. 여기서는 표면으로만 가른다.
            <div key={i} className={t.role === "user" ? "tile" : "card"} style={{ padding: 16 }}>
              <p className="caption">{t.role === "user" ? "나" : "튜터"}</p>
              <p className="body-sm mt-1 whitespace-pre-wrap">{t.text}</p>
            </div>
          ))
        )}
        {sending ? <p className="body-sm">생각하는 중입니다.</p> : null}
        {error ? <p className="body-sm link-strong">{error}</p> : null}
      </div>

      <div className="mt-4">
        <textarea
          ref={inputRef}
          className="text-input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="무엇이 막혔나요"
          aria-label="튜터에게 물어볼 말"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="caption">Enter 로 보냅니다</span>
          <button
            type="button"
            onClick={send}
            disabled={sending || !draft.trim()}
            className="btn-primary"
          >
            보내기
          </button>
        </div>
      </div>
    </div>
  );
}
