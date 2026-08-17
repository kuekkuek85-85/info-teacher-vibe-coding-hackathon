"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ConsentGate from "@/components/ConsentGate";
import { POLICY_VERSION } from "@/lib/policy";
import { CONSENT_CHANGED, hasAgreed, markAgreed } from "@/lib/session";

/**
 * 서약을 받기 전에는 참가자 화면을 열지 않는다.
 * 홈에서만 막으면 주소를 직접 치고 들어가 지나칠 수 있다.
 *
 * 덮기만 해서는 부족하다. 아래 화면이 그려지는 순간 익명 로그인과 Firestore
 * 조회가 시작된다. 동의하기 전에는 아예 그리지 않는다.
 *
 * 약관과 방침은 막지 않는다. 무엇에 동의하는지 읽고 정해야 한다.
 * 강사 화면도 막지 않는다. PIN 으로 따로 들어가는 자리다.
 */
const OPEN_PATHS = ["/terms", "/privacy", "/teacher"];

export default function ConsentGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [agreed, setAgreed] = useState<boolean | null>(null);

  useEffect(() => {
    const read = () => setAgreed(hasAgreed(POLICY_VERSION));
    read();
    // 나가기를 누르면 동의 기록도 지운다. 다음 사람 앞에 다시 서야 한다.
    window.addEventListener(CONSENT_CHANGED, read);
    return () => window.removeEventListener(CONSENT_CHANGED, read);
  }, []);

  const open = OPEN_PATHS.some((p) => pathname?.startsWith(p));
  const blocking = agreed === false && !open;

  // 아래 화면을 그리지 않으므로 따로 잠글 것이 없다. 뒤에 아무것도 없다.
  // 서약을 확인하는 사이에도 그리지 않는다. 한순간이지만 조회가 시작된다.
  if (agreed === null && !open) return null;

  if (blocking) {
    return (
      <ConsentGate
        onAgree={() => {
          markAgreed(POLICY_VERSION);
          setAgreed(true);
        }}
      />
    );
  }

  return <>{children}</>;
}
