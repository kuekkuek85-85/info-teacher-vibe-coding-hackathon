"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ensureAnonAuth } from "@/lib/firebase";

/**
 * 적은 아이디어를 그 자리에서 캐묻는다.
 * 카드를 복사해 다른 창으로 옮기지 않아도 되게 하려는 것이다.
 * 답은 화면에만 있고 저장하지 않는다. 남길 것은 아래 두 칸에 직접 적는다.
 */
export default function GrillPanel({
  name,
  idea,
  roles,
}: {
  name: string;
  /** 지금 적고 있는 아이디어 한 줄 */
  idea: string;
  /** 지금 적고 있는 사용자와 역할 */
  roles: string;
}) {
  const [reply, setReply] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 물을 때의 문장을 붙들어 둔다. 기다리는 동안 고치면 답이 무엇을 본 것인지 흐려진다.
  const [asked, setAsked] = useState<{ idea: string; roles: string } | null>(null);

  const stale = Boolean(asked) && (asked?.idea !== idea || asked?.roles !== roles);

  const ask = async () => {
    if (asking) return;
    if (!idea.trim()) {
      setError("아이디어 한 줄을 먼저 적어 주세요.");
      return;
    }
    setAsking(true);
    setError(null);
    // 새로 물으면 앞 답은 지운다. 나란히 두면 어느 것이 지금 것인지 헷갈린다.
    setReply(null);
    setAsked({ idea, roles });
    try {
      // 이름만 보내면 남의 이름을 대고 쓸 수 있다. 입장 토큰을 함께 보낸다.
      const { idToken } = await ensureAnonAuth();
      const res = await fetch("/api/grill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ name, idea, roles }),
      });
      const data = (await res.json()) as { ok?: boolean; reply?: string; message?: string };
      if (!res.ok || !data.ok || !data.reply) {
        setError(data.message ?? "답을 받지 못했습니다. 잠시 뒤 다시 눌러 주세요.");
        return;
      }
      setReply(data.reply);
    } catch {
      setError("연결하지 못했습니다. 잠시 뒤 다시 눌러 주세요.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">아이디어 다듬기</p>
          <p className="body-sm mt-2">
            적은 아이디어를 캐묻습니다. 질문 다섯 개가 오고 답은 정해 주지 않습니다.
          </p>
        </div>
        <button type="button" onClick={ask} disabled={asking} className="btn-primary">
          {asking ? "캐묻는 중" : reply ? "다시 캐묻기" : "뾰족하게"}
        </button>
      </div>

      {error ? <p className="body-sm link-strong mt-4">{error}</p> : null}

      {asking && !reply ? <p className="body-sm mt-4">읽고 있습니다.</p> : null}

      {reply ? (
        <>
          {stale ? (
            <p className="body-sm link-strong mt-4">
              적은 것이 바뀌었습니다. 아래 답은 바뀌기 전 문장을 보고 나온 것입니다.
            </p>
          ) : null}
          <div className="tile md mt-5" aria-live="polite">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{reply}</ReactMarkdown>
          </div>
        </>
      ) : null}
    </section>
  );
}
