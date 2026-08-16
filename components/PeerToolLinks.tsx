"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { peerTool } from "@/lib/peerTool";
import type { Progress } from "@/lib/types";

/**
 * m8 에서 쓴다. m5 에서 검토한 그 사람의 도구를 실제로 열어 보게 한다.
 */
export default function PeerToolLinks({ target }: { target?: string }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // 상대가 바뀌면 앞사람 링크가 새 이름 아래 남지 않게 먼저 비운다
    setProgress(null);
    setLoading(true);
    setFailed(false);
    if (!target) return;
    return onSnapshot(
      doc(getDb(), "progress", target),
      (snap) => {
        setProgress(snap.exists() ? ({ ...snap.data() } as Progress) : null);
        setLoading(false);
      },
      () => {
        // 구독이 끊기면 계속 기다리는 것처럼 보이면 안 된다
        setLoading(false);
        setFailed(true);
      },
    );
  }, [target]);

  const { submitted, deploy, repo, remaining } = peerTool(progress);

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">내 동료의 도구</p>
        {target ? <span className="caption">상대 · {target}</span> : null}
      </div>

      {!target ? (
        <p className="mt-4">검토 상대가 아직 배정되지 않았습니다.</p>
      ) : failed ? (
        <p className="body-sm mt-4">
          상대의 제출물을 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.
        </p>
      ) : loading ? (
        <p className="body-sm mt-4">불러오는 중입니다.</p>
      ) : (
        <>
          <p className="body-sm mt-4">
            {!submitted
              ? `${target} 님이 아직 m7 을 제출하지 않았습니다. 제출하면 여기에 뜹니다.`
              : !deploy && !repo
                ? `${target} 님이 주소를 적지 않았습니다.`
                : "m5 에서 계획을 검토한 그 도구입니다. 직접 써 보고 아래 칸에 한 줄 남겨 주세요."}
          </p>

          {deploy || repo ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {deploy ? (
                <a
                  href={deploy}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-primary"
                >
                  도구 열기
                </a>
              ) : null}
              {repo ? (
                <a
                  href={repo}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-secondary"
                >
                  코드 보기
                </a>
              ) : null}
            </div>
          ) : null}

          {remaining ? (
            <div className="tile mt-5">
              <p className="caption">{target} 님이 적은 남은 일</p>
              <p className="body-sm mt-2 whitespace-pre-wrap">{remaining}</p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
