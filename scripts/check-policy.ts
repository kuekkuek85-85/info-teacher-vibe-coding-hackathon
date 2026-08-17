// 약관과 서약이 이 앱이 실제로 하는 일을 적고 있는지 확인한다.
// 실행: node scripts/check-policy.ts
import { readFileSync } from "node:fs";
import { PLEDGE_ITEMS, POLICY_VERSION, PRIVACY, TERMS } from "../lib/policy.ts";

let failures = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

const termsText = TERMS.flatMap((s) => [s.heading, ...s.body]).join("\n");
const privacyText = PRIVACY.flatMap((s) => [s.heading, ...s.body]).join("\n");
const pledgeText = PLEDGE_ITEMS.flatMap((p) => [p.label, p.detail]).join("\n");

// 1. 뼈대
check("판이 날짜로 적혀 있다", /^\d{4}-\d{2}-\d{2}$/.test(POLICY_VERSION), POLICY_VERSION);
check("약관에 절이 여럿 있다", TERMS.length >= 5, `${TERMS.length}절`);
check("방침에 절이 여럿 있다", PRIVACY.length >= 5, `${PRIVACY.length}절`);
check("빈 절이 없다", [...TERMS, ...PRIVACY].every((s) => s.heading && s.body.length > 0));
check("서약이 다섯 항목", PLEDGE_ITEMS.length === 5, `${PLEDGE_ITEMS.length}개`);
check("서약 키가 겹치지 않는다", new Set(PLEDGE_ITEMS.map((p) => p.key)).size === 5);
check("서약마다 설명이 붙는다", PLEDGE_ITEMS.every((p) => p.label && p.detail));

// 2. 이 앱이 실제로 하는 일을 빠뜨리지 않았는지.
// 빠뜨리면 참가자가 모른 채 동의하게 된다.
for (const [label, key] of Object.entries({
  "AI 로 글이 나간다": "Gemini",
  "광장 공개": "광장",
  "주소를 아는 사람도 본다": "주소를 아는 사람은",
  "동료 검토 열람": "동료 검토",
  "강사가 화면을 덮는다": "자료로 덮입니다",
  "학생 정보 금지": "학생의 실명",
  "한 이름 한 기기": "한 기기",
})) {
  check(`약관이 ${label} 를 적는다`, termsText.includes(key), key);
}

for (const [label, key] of Object.entries({
  이름과소속: "이름과 소속",
  제출물: "미션 제출물",
  익명식별자: "익명 로그인 식별자",
  "AI 호출 기록": "AI 호출 횟수",
  보관처: "Firestore",
  "AI 전송": "Gemini API",
  브라우저저장: "브라우저에도",
  보관기간: "일주일",
  "인터넷에 열려 있음": "주소를 아는 사람은",
})) {
  check(`방침이 ${label} 를 적는다`, privacyText.includes(key), key);
}

// 3. 안 하는 일을 한다고 적지 않았는지
check("비밀번호를 받는다고 적지 않는다", privacyText.includes("비밀번호를 받지 않습니다"));
check("추적하지 않는다고 적는다", privacyText.includes("따라다니지 않습니다"));
check("대화를 저장하지 않는다고 적는다", privacyText.includes("저장하지 않습니다"));

// 4. 서약이 약관의 무거운 대목을 담고 있는지
for (const [label, key] of Object.entries({
  학생정보: "학생의 실명",
  "AI 전송": "Google 서버",
  공개범위: "광장",
  본인이름: "제 이름으로만",
  결과책임: "책임은 저에게",
})) {
  check(`서약이 ${label} 를 담는다`, pledgeText.includes(key), key);
}

// 5. 화면이 이 글을 쓰는지
const gate = readFileSync(new URL("../components/ConsentGate.tsx", import.meta.url), "utf8");
check("서약 팝업이 목록을 가져다 쓴다", gate.includes("PLEDGE_ITEMS"));
check("다 체크해야 넘어간다", gate.includes("disabled={left > 0}"));
check("전문 링크가 있다", gate.includes('href="/terms"') && gate.includes('href="/privacy"'));

// 홈에서만 막으면 주소를 직접 치고 지나칠 수 있다
const guard = readFileSync(new URL("../components/ConsentGuard.tsx", import.meta.url), "utf8");
check("판을 키에 넣어 기억한다", guard.includes("markAgreed(POLICY_VERSION)"));
check("약관과 방침은 막지 않는다", guard.includes('"/terms", "/privacy"'));
check("강사 화면은 막지 않는다", guard.includes('"/teacher"'));
// 덮기만 하면 아래 화면이 그려지면서 익명 로그인과 Firestore 조회가 시작된다
check("서약 전에는 아래를 그리지 않는다", guard.includes("if (blocking)"));
check("확인하는 사이에도 그리지 않는다", guard.includes("agreed === null && !open) return null"));
check("통과하면 그대로 그린다", guard.includes("return <>{children}</>"));
check("가드가 직접 잠그지 않는다", !guard.includes("lockRoot"));

// 덮는 것이 둘 이상일 수 있다. 각자 잠그면 하나가 끝날 때 남의 잠금까지 풀린다.
const lock = readFileSync(new URL("../lib/lockRoot.ts", import.meta.url), "utf8");
check("몇 개가 잠갔는지 센다", lock.includes("holders += 1") && lock.includes("holders -= 1"));
check("마지막 하나가 놓을 때만 푼다", lock.includes("if (holders > 0) return"));
check("두 번 풀어도 남의 것은 안 열린다", lock.includes("if (released) return"));

const layout2 = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
check("서약이 어느 화면에서나 선다", layout2.includes("<ConsentGuard>"));
check("모든 화면이 가드 안에 있다", /<ConsentGuard>[\s\S]*\{children\}[\s\S]*<\/ConsentGuard>/.test(layout2));

// 나가기가 이름만 지우면 앞사람이 쓴 글이 기기에 남는다
const session = readFileSync(new URL("../lib/session.ts", import.meta.url), "utf8");
check(
  "나가기가 남은 글까지 지운다",
  /NAMED_PREFIXES = \["draft:", "prompt:", "readme:", "basecamp:agreed:"\]/.test(session),
);
check("나가면 서약을 다시 받는다", session.includes('"basecamp:agreed:"'));
check("메모리에 쥔 것도 놓는다", session.includes("for (const key of [...memory.keys()])"));
check("동의가 바뀌면 알린다", session.includes("dispatchEvent(new Event(CONSENT_CHANGED))"));
check("들어올 때도 알린다", /markAgreed[\s\S]{0,140}announce\(\)/.test(session));
check("나갈 때도 알린다", /clearSession[\s\S]{0,1200}announce\(\)/.test(session));
check("문지기가 그 소식을 듣는다", guard.includes("addEventListener(CONSENT_CHANGED, read)"));
check("듣던 것을 뗀다", guard.includes("removeEventListener(CONSENT_CHANGED, read)"));

// 자료 덮개는 문지기 바깥에 산다. 잠금에 걸리면 저 자신이 안 눌리기 때문이다
const overlay = readFileSync(new URL("../components/SlideOverlay.tsx", import.meta.url), "utf8");
check("덮개도 동의를 직접 본다", overlay.includes("hasAgreed(POLICY_VERSION)"));
check("동의 전에는 구독하지 않는다", /if \(!allowed\) \{\s*setDeckId\(""\);\s*return;/.test(overlay));
check("동의가 바뀌면 다시 판단한다", overlay.includes("}, [allowed]);"));
// 효과가 돌기 전 한 프레임 동안 남은 자료가 서약을 가린다
check("덮을지도 동의를 보고 정한다", overlay.includes("const showing = allowed && Boolean(deck)"));
check("나가기가 저장소를 훑는다", session.includes("window.localStorage.key(i)"));
check("방침이 그 사실을 적는다", privacyText.includes("README 사본, 프롬프트 카드 내용을 함께 지웁니다"));

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
check("홈은 서약 전에 아무것도 안 그린다", home.includes("if (!agreed) return null"));

const footer = readFileSync(new URL("../components/Footer.tsx", import.meta.url), "utf8");
check("푸터에 두 링크가 있다", footer.includes('href="/terms"') && footer.includes('href="/privacy"'));

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
check("푸터가 어느 화면에나 선다", layout.includes("<Footer />"));

for (const route of ["terms", "privacy"]) {
  const page = readFileSync(new URL(`../app/${route}/page.tsx`, import.meta.url), "utf8");
  check(`${route} 화면이 읽기 전용이다`, !page.includes("<input") && !page.includes("<textarea"));
  check(`${route} 화면에 홈으로 가는 길이 있다`, page.includes('href="/"'));
}

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
