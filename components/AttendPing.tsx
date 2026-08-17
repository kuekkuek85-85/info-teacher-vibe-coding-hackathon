"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ensureAnonAuth } from "@/lib/firebase";
import { POLICY_VERSION } from "@/lib/policy";
import { CONSENT_CHANGED, getSavedName, hasAgreed } from "@/lib/session";

/**
 * 오늘 왔다는 표시를 한 번 찍는다.
 *
 * 워크숍은 이틀이다. 어제 들어온 사람은 이름이 기기에 남아 입장 화면을 거치지 않는다.
 * 그대로 두면 어제 날짜가 남아 오늘 대시보드와 짝 배정에서 빠진다.
 *
 * 홈에만 두면 주소를 눌러 /mission/m3 나 /readme 로 바로 돌아온 사람이 빠진다.
 * 그래서 모든 화면이 지나는 자리에 둔다.
 *
 * 다만 약관과 방침, 강사 화면은 서약 없이도 열린다. 거기서 도는 것을 막지 않으면
 * 약관을 읽으러 들어온 것만으로 익명 로그인과 출석 기록이 일어난다.
 */
export default function AttendPing() {
  const pathname = usePathname();
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const read = () => setAgreed(hasAgreed(POLICY_VERSION));
    read();
    window.addEventListener(CONSENT_CHANGED, read);
    return () => window.removeEventListener(CONSENT_CHANGED, read);
  }, []);

  // 강사 화면은 참가자 기록을 건드리지 않는다. PIN 으로 따로 들어가는 자리다.
  const teacher = pathname?.startsWith("/teacher") === true;

  useEffect(() => {
    if (!agreed || teacher) return;
    const name = getSavedName();
    if (!name) return;
    let cancelled = false;
    (async () => {
      try {
        const { idToken } = await ensureAnonAuth();
        if (cancelled) return;
        await fetch("/api/attend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, idToken }),
        });
      } catch {
        // 표시가 실패해도 미션은 그대로 쓴다. 강사가 전체 명단으로 볼 수 있다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agreed, teacher]);

  return null;
}
