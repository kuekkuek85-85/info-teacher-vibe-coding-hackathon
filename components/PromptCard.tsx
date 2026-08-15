"use client";

import { useState } from "react";

export default function PromptCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="plate">
      <div className="section-bar">
        <span className="bar-glyph" />
        클로드에 붙여넣을 카드
        <button type="button" onClick={copy} className="btn-amber ml-auto">
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre className="m-2 overflow-x-auto whitespace-pre-wrap bg-surface p-3 text-[11px] leading-relaxed text-ink"
        style={{
          borderTop: "2px solid #3d4f97",
          borderLeft: "1px solid #3d4f97",
          borderRight: "1px solid #ffffff",
          borderBottom: "1px solid #ffffff",
        }}
      >
        {text}
      </pre>
    </section>
  );
}
