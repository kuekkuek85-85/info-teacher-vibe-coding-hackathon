"use client";

import { useState } from "react";
import Link from "next/link";
import { PLEDGE_ITEMS } from "@/lib/policy";

/**
 * 들어오기 전에 함께 읽고 하나씩 체크하는 서약.
 * 한 번에 동의를 받지 않고 항목마다 손을 대게 한다. 읽지 않고 넘기지 않게 하려는 것이다.
 */
export default function ConsentGate({ onAgree }: { onAgree: () => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const left = PLEDGE_ITEMS.filter((item) => !checked[item.key]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="이용약관 서약"
        className="card max-h-[85vh] w-full max-w-2xl overflow-y-auto"
      >
        <p className="eyebrow">시작하기 전에</p>
        <h1 className="display-lg mt-3">함께 읽고 약속합니다</h1>
        <p className="body-lg mt-4">
          다섯 가지를 하나씩 읽고 체크해 주세요. 학생에게 시키는 것을 먼저 해 보는
          자리입니다.
        </p>

        <ul className="mt-8 space-y-5">
          {PLEDGE_ITEMS.map((item) => (
            <li key={item.key}>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 accent-black"
                  checked={checked[item.key] === true}
                  onChange={(e) =>
                    setChecked((prev) => ({ ...prev, [item.key]: e.target.checked }))
                  }
                />
                <span>
                  <span className="body-lg link-strong">{item.label}</span>
                  <span className="body-sm mt-1 block">{item.detail}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="btn-primary"
            disabled={left > 0}
            onClick={onAgree}
          >
            동의하고 시작하기
          </button>
          <span className="body-sm">
            {left > 0 ? `${left}개가 남았습니다` : "전문은 아래 링크에서 볼 수 있습니다"}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-6">
          <Link href="/terms" className="link-strong body-sm">
            이용약관 전문
          </Link>
          <Link href="/privacy" className="link-strong body-sm">
            개인정보처리방침 전문
          </Link>
        </div>
      </div>
    </div>
  );
}
