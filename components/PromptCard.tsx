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
    <section className="card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-inkMuted">클로드에 붙여넣을 카드</p>
        <button type="button" onClick={copy} className="btn-secondary">
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-[10px] bg-canvas p-4 text-[13px] leading-relaxed">
        {text}
      </pre>
    </section>
  );
}
