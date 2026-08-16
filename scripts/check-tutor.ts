// AI 튜터의 서버 쪽 판단을 확인한다. Gemini 를 부르지 않는다.
// 실행: node scripts/check-tutor.ts
import { readFileSync } from "node:fs";
import {
  MAX_TURNS,
  MAX_TURN_CHARS,
  MODEL_CHAIN,
  RATE_LIMIT,
  buildSystemPrompt,
  nextHits,
  modelsToTry,
  shouldTryNextModel,
  validateTurns,
} from "../lib/tutor.ts";
import type { Mission } from "../lib/types.ts";

let failures = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

const mission: Mission = {
  id: "m6",
  title: "테스트 코드 작성 · RED",
  stepLabel: "구현 1차",
  order: 6,
  session: "스프린트 2",
  tool: "agent",
  guide: "구현 전에 채점 기준부터 만듭니다.",
  promptCard: "실패하는 테스트만 써 줘",
  fields: [
    { key: "first_prompt", label: "내가 보낸 첫 지시문", type: "textarea" },
    { key: "red_count", label: "실패한 테스트 개수", type: "text" },
  ],
  carryover: [],
  open: true,
  visibility: "name",
};

// 1. 지금 단계가 시스템 프롬프트에 들어간다
const prompt = buildSystemPrompt(mission);
check("단계 번호와 제목이 들어간다", prompt.includes('m6 "테스트 코드 작성 · RED"'));
check("안내문이 들어간다", prompt.includes("구현 전에 채점 기준부터"));
check("적어야 하는 칸이 들어간다", prompt.includes("내가 보낸 첫 지시문"));
check("카드가 들어간다", prompt.includes("실패하는 테스트만 써 줘"));
check("도구를 말해 준다", prompt.includes("클로드 코드로 한다"));
check("한국어로 답하게 한다", prompt.includes("한국어"));
check("대신 정해 주지 않게 한다", prompt.includes("대신 골라 주지 말고"));
check("개인정보를 막는다", prompt.includes("학생 실명"));
check("마크다운 기호를 막는다", prompt.includes("마크다운 기호를 쓰지 않는다"));

// 2. 사람이 직접 적는 단계는 대신 써 주지 않는다
const human = buildSystemPrompt({ ...mission, id: "m10", tool: "human", promptCard: undefined });
check("사람 단계에서는 대신 쓰지 않는다", human.includes("대신 써 주지 말고"));
check("카드가 없으면 카드 줄이 없다", !human.includes("붙여넣는 카드"));

// 3. 단계를 모를 때도 프롬프트가 선다
const none = buildSystemPrompt(null);
check("단계를 모르면 물어보게 한다", none.includes("어느 단계인지 물어본다"));
check("단계를 몰라도 기본 규칙은 남는다", none.includes("한국어"));

// 4. 보낸 값 검사
const ok = validateTurns([{ role: "user", text: "무엇부터 할까요" }]);
check("정상 대화는 통과", "turns" in ok && ok.turns.length === 1);
check("빈 배열은 거부", "error" in validateTurns([]));
check("배열이 아니면 거부", "error" in validateTurns("안녕"));
check("모르는 역할은 거부", "error" in validateTurns([{ role: "system", text: "x" }]));
check("빈 말은 거부", "error" in validateTurns([{ role: "user", text: "   " }]));
check(
  "너무 긴 말은 거부",
  "error" in validateTurns([{ role: "user", text: "가".repeat(MAX_TURN_CHARS + 1) }]),
);
check(
  "마지막이 튜터 차례면 거부",
  "error" in validateTurns([{ role: "user", text: "a" }, { role: "model", text: "b" }]),
);

const long = Array.from({ length: MAX_TURNS + 10 }, (_, i) => ({
  role: i % 2 === 0 ? "user" : "model",
  text: `${i}`,
}));
// 마지막이 사용자 차례가 되게 맞춘다
long.push({ role: "user", text: "마지막" });
const trimmed = validateTurns(long);
check(
  "긴 대화는 앞을 자른다",
  "turns" in trimmed && trimmed.turns.length === MAX_TURNS,
  "turns" in trimmed ? `${trimmed.turns.length}` : "",
);
check(
  "자를 때 지금 하는 말은 남는다",
  "turns" in trimmed && trimmed.turns[trimmed.turns.length - 1].text === "마지막",
);

// 5. 몰아 보내기 제한
const now = 1_786_000_000_000;
let hits: number[] = [];
let allowed = 0;
for (let i = 0; i < RATE_LIMIT + 5; i++) {
  const r = nextHits(hits, now + i);
  hits = r.hits;
  if (r.allowed) allowed++;
}
check("정해진 횟수까지만 통과", allowed === RATE_LIMIT, `${allowed}`);
check("막힌 뒤에도 기록이 늘지 않는다", hits.length === RATE_LIMIT, `${hits.length}`);
check(
  "시간이 지나면 다시 열린다",
  nextHits(hits, now + 5 * 60 * 1000 + 1).allowed,
);
check("기록이 없으면 통과", nextHits(undefined, now).allowed);
check("이상한 값이 섞여 있어도 버틴다", nextHits(["x", null, now], now).allowed);
check(
  "창 밖 기록은 버린다",
  nextHits([now - 10 * 60 * 1000], now).hits.length === 1,
);

// 6. 모델이 내려가거나 몰려도 다음으로 넘어간다
check("모델을 여러 개 준비한다", MODEL_CHAIN.length >= 3, `${MODEL_CHAIN.length}`);
check("없어진 모델이면 다음으로", shouldTryNextModel(404));
check("몰려 있으면 다음으로", shouldTryNextModel(503) && shouldTryNextModel(429));
check("키가 틀린 것은 넘어가도 소용없다", !shouldTryNextModel(400) && !shouldTryNextModel(403));
check("지정한 모델이 맨 앞에 선다", modelsToTry("내모델")[0] === "내모델");
check(
  "지정한 모델이 뒤에 또 나오지 않는다",
  modelsToTry(MODEL_CHAIN[1]).filter((m) => m === MODEL_CHAIN[1]).length === 1,
);
check("비워 두면 기본 순서", modelsToTry("")[0] === MODEL_CHAIN[0]);
check("공백만 적어도 기본 순서", modelsToTry("   ").length === MODEL_CHAIN.length);
check("지난번에 답한 모델을 앞세운다", modelsToTry("", MODEL_CHAIN[2])[0] === MODEL_CHAIN[2]);
check(
  "지정한 모델이 지난번보다 앞",
  JSON.stringify(modelsToTry("내모델", MODEL_CHAIN[1]).slice(0, 2)) ===
    JSON.stringify(["내모델", MODEL_CHAIN[1]]),
);
check(
  "둘이 같아도 한 번만 선다",
  modelsToTry("내모델", "내모델").filter((m) => m === "내모델").length === 1,
);
check(
  "앞세워도 목록이 빠지지 않는다",
  MODEL_CHAIN.every((m) => modelsToTry("내모델", MODEL_CHAIN[3]).includes(m)),
);

// 7. 튜터 라우트가 지켜야 할 것
const route = readFileSync(new URL("../app/api/tutor/route.ts", import.meta.url), "utf8");
check("입장한 사람인지 본다", route.includes("checkParticipant"));
check("몰아 보내기를 막는다", route.includes("checkRate"));
check("단계 정보를 서버에서 읽는다", route.includes('collection("missions")'));
check("열지 않은 단계는 넘기지 않는다", route.includes('snap.data()?.open === true'));
check("키가 없으면 안내만 낸다", route.includes("GEMINI_API_KEY"));
check("요청 전체에 시간을 끊는다", route.includes("TOTAL_TIMEOUT_MS"));
check(
  "요청에 들어서자마자 잰다",
  route.indexOf("const deadline") < route.indexOf("GEMINI_API_KEY"),
);
check("본문 읽기도 시간 안에 둔다", route.includes("withDeadline(request.json()"));
check("단계 조회도 시간 안에 둔다", route.includes("withDeadline(\n        who.db"));

const panel = readFileSync(new URL("../components/TutorPanel.tsx", import.meta.url), "utf8");
check("화면이 토큰을 실어 보낸다", panel.includes("Bearer ${idToken}"));

// 8. 부르는 장치는 한 곳에 있다. 튜터와 캐묻기가 함께 쓴다.
const gemini = readFileSync(new URL("../lib/gemini.ts", import.meta.url), "utf8");
check("입장 토큰을 검증한다", gemini.includes("verifyIdToken"));
check("그 이름의 주인인지 본다", gemini.includes("ownerUid !== uid"));
check("횟수를 함께 쓰는 곳에 센다", gemini.includes("runTransaction"));
check("키를 응답에 흘리지 않는다", !gemini.includes("await res.text()"));
// 생각하는 토큰까지 이 한도에서 나간다. 좁으면 답이 중간에 끊긴다.
check("답이 잘리지 않을 만큼 준다", /maxOutputTokens:\s*2048/.test(gemini));
check("길게 생각하지 않게 한다", gemini.includes('thinkingLevel: "low"'));
check("설정을 모르는 모델이면 빼고 다시 부른다", gemini.includes("res.status === 400"));
check("답한 모델을 기억한다", gemini.includes("lastGood = model"));
check("모델마다 시간을 끊는다", gemini.includes("AbortSignal.timeout("));
check("남은 시간만큼만 준다", gemini.includes("Math.min(CALL_TIMEOUT_MS, left)"));
check("남은 시간이 없으면 부르지 않는다", gemini.includes("if (left <= 0) throw"));
check("토큰 검증에도 시간을 끊는다", gemini.includes("withDeadline(getAdminAuth()"));
check(
  "늦은 것과 틀린 것을 가른다",
  (gemini.match(/e instanceof DeadlineError/g) ?? []).length >= 1,
);
check(
  "Firestore 도 시간을 끊는다",
  (gemini.match(/withDeadline\(/g) ?? []).length >= 3,
  `${(gemini.match(/withDeadline\(/g) ?? []).length}곳`,
);
check(
  "끊기면 다음 모델로 간다",
  /console\.error\(`gemini: \$\{model\} 응답 없음`\);\s*lastStatus = 504;\s*continue;/.test(gemini),
);
// 본문 읽기가 try 밖에 있으면 잘못된 JSON 하나로 폴백 없이 끝난다.
check(
  "본문 읽기도 같은 try 안에 있다",
  gemini.indexOf("await res.json()") >
    gemini.indexOf("let reply: string | null = null;") &&
    gemini.indexOf("await res.json()") < gemini.indexOf("gemini: ${model} 응답 없음"),
);

const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
check(
  "환경 변수 설명이 실제 첫 모델과 같다",
  envExample.includes(MODEL_CHAIN[0]),
  MODEL_CHAIN[0],
);

const page = readFileSync(new URL("../app/mission/[id]/page.tsx", import.meta.url), "utf8");
check("잠긴 미션 화면에는 띄우지 않는다", /mission\?\.open \? \(\s*<TutorPanel/.test(page));

// 홈에서는 칸을 바꿔도 화면이 안 갈린다. key 가 없으면 앞 단계 대화가 남는다.
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
check("칸을 바꾸면 튜터를 새로 연다", /<TutorPanel\s+key=\{open\.id\}/.test(home));

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
