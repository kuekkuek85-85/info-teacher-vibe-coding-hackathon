"use client";

import { useEffect, useRef, useState } from "react";
import type { MissionTool } from "@/lib/types";

const LABEL: Record<MissionTool, string> = {
  human: "옮겨 적을 카드",
  chat: "AI 대화창에 붙여넣을 카드",
  agent: "클로드 코드에 붙여넣을 카드",
};

/**
 * 어딘가에 옮겨 붙일 카드. 머리말은 미션의 진행 방식에 따라 갈린다.
 * 채울 것이 있으면 내 제출물이 들어간 채로 열린다.
 * 고친 내용은 이 브라우저에만 둔다. 제출물이 아니라 보내기 전 메모다.
 */
export default function PromptCard({
  text,
  storageKey,
  filled = false,
  tool = "human",
}: {
  text: string;
  /** 고친 내용을 이 브라우저에 남길 키. 없으면 남기지 않는다 */
  storageKey?: string;
  /** 내 제출물이 자동으로 채워지는 카드인지. m8 처럼 아닌 것도 있다 */
  filled?: boolean;
  /** 어디에 붙여넣는 카드인지. 미션의 진행 방식을 그대로 받는다 */
  tool?: MissionTool;
}) {
  // human 단계에도 카드를 두면 어디에 붙여넣을지 말해야 한다.
  const label = LABEL[tool];
  const [edited, setEdited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // null 로 시작해서 storageKey 가 없을 때도 첫 실행이 한 번은 돈다
  const loadedKey = useRef<string | undefined | null>(null);

  // 고친 값이 있으면 그것을, 없으면 지금 조립된 카드를 보여 준다.
  // 이렇게 두면 제출물이 늦게 도착해도 화면이 따라온다.
  const value = edited ?? text;

  useEffect(() => {
    if (loadedKey.current === storageKey) return;
    loadedKey.current = storageKey;
    if (!storageKey) {
      setEdited(null);
      return;
    }
    try {
      // 없으면 null 이 들어간다. 앞 미션에서 고친 내용이 넘어오면 안 된다.
      setEdited(localStorage.getItem(storageKey));
    } catch {
      setEdited(null);
    }
  }, [storageKey]);

  const update = (next: string) => {
    setEdited(next);
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // 저장소가 막혔으면 이번 화면에서만 유지된다
    }
  };

  const reset = () => {
    const question = filled
      ? "고친 내용을 버리고 내 제출물로 다시 채웁니다. 계속할까요?"
      : "고친 내용을 버리고 원래 카드로 되돌립니다. 계속할까요?";
    if (!confirm(question)) return;
    setEdited(null);
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // 지우지 못해도 화면은 원래 카드다
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{label}</p>
          <p className="body-sm mt-2">
            {filled
              ? "내가 적은 내용이 이미 들어가 있습니다. 고쳐서 복사하세요."
              : "필요한 곳을 채우고 복사하세요."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn-secondary">
            {filled ? "다시 채우기" : "원래대로"}
          </button>
          <button type="button" onClick={copy} className="btn-primary">
            {copied ? "복사됨" : "전체 복사"}
          </button>
        </div>
      </div>

      <textarea
        className="text-input mt-5"
        style={{
          minHeight: "40vh",
          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
          fontSize: 15,
          lineHeight: 1.6,
        }}
        value={value}
        onChange={(e) => update(e.target.value)}
        spellCheck={false}
        aria-label={label}
      />
    </section>
  );
}
