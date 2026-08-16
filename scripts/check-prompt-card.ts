// 프롬프트 카드에 내 제출물이 제대로 들어가는지 확인한다.
// 실행: node scripts/check-prompt-card.ts
import { readFileSync } from "node:fs";
import { buildPromptText } from "../lib/promptCard.ts";
import type { Mission, Progress } from "../lib/types.ts";

let failures = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

const m3: Mission = {
  id: "m3",
  title: "PRD 만들기",
  stepLabel: "3",
  order: 3,
  session: "1일차",
  guide: "안내",
  fields: [
    { key: "problem", label: "문제(병목) 한 문단", type: "textarea" },
    { key: "mvp", label: "MVP 한 문장", type: "textarea" },
  ],
  carryover: [],
  open: true,
  visibility: "name",
};

const m4: Mission = {
  id: "m4",
  title: "구현 계획",
  stepLabel: "4",
  order: 4,
  session: "1일차",
  guide: "안내",
  promptCard: "아래 PRD로 계획을 만들어줘.\n--- PRD ---\n(붙여넣기)",
  promptFill: {
    slot: "(붙여넣기)",
    sources: [{ mission: "m3", label: "PRD", keys: ["problem", "mvp"] }],
  },
  fields: [{ key: "scenario", label: "사용자 시나리오", type: "textarea" }],
  carryover: [],
  open: true,
  visibility: "name",
};

const missions = [m3, m4];

const withData = (data: Record<string, string>): Progress => ({
  ownerUid: "u",
  name: "수강생01",
  school: "○○중",
  role: "student",
  missions: { m3: { status: "submitted", data } },
  currentStep: "m4",
  stuck: false,
});

// 1. 제출물이 있으면 자리표시자가 사라지고 라벨과 값이 들어간다
const filled = buildPromptText(
  m4,
  missions,
  withData({ problem: "채점이 일주일 걸립니다.", mvp: "사진 찍으면 채점" }),
);
check("자리표시자가 남지 않는다", !filled.includes("(붙여넣기)"));
check("출처 이름이 제목으로 들어간다", filled.includes("## PRD"));
check("필드 라벨이 들어간다", filled.includes("### 문제(병목) 한 문단"));
check("내가 적은 값이 들어간다", filled.includes("채점이 일주일 걸립니다."));
check("카드 앞부분은 그대로다", filled.startsWith("아래 PRD로 계획을 만들어줘."));

// 2. 아직 안 적은 칸은 빈 채로 두지 않고 표시한다
const partial = buildPromptText(m4, missions, withData({ problem: "채점이 오래 걸립니다." }));
check("빈 칸에 안내가 들어간다", partial.includes("(아직 적지 않았습니다)"));
check("빈 칸의 라벨도 남는다", partial.includes("### MVP 한 문장"));

// 3. 제출물이 아직 도착하지 않아도 카드는 열려야 한다
const none = buildPromptText(m4, missions, null);
check("제출물이 없어도 자리표시자가 사라진다", !none.includes("(붙여넣기)"));
check("제출물이 없으면 전부 안내로 채운다", none.split("(아직 적지 않았습니다)").length === 3);

// 4. 스냅샷이 늦게 와도 다시 조립하면 값이 반영된다
check(
  "늦게 온 제출물이 반영된다",
  none !== filled && filled.includes("사진 찍으면 채점"),
);

// 5. 공백만 적은 값은 안 적은 것으로 본다
const blankish = buildPromptText(m4, missions, withData({ problem: "   ", mvp: "" }));
check("공백만 적으면 안내로 바꾼다", blankish.split("(아직 적지 않았습니다)").length === 3);

// 6. 채울 설정이 없는 카드는 손대지 않는다
const m8: Mission = {
  ...m4,
  id: "m8",
  promptCard: "아래 코드를 리뷰해줘.\n(붙여넣기)",
  promptFill: undefined,
};
check("promptFill 이 없으면 원본 그대로", buildPromptText(m8, missions, withData({})) === m8.promptCard);

// 7. 없는 미션을 가리키면 조용히 건너뛴다
const broken: Mission = {
  ...m4,
  promptFill: { slot: "(붙여넣기)", sources: [{ mission: "없음", keys: ["x"] }] },
};
check("출처 미션이 없으면 원본 그대로", buildPromptText(broken, missions, null) === m4.promptCard);

// 8. 미션을 옮겨도 앞 카드에서 고친 내용이 따라오면 안 된다.
// 화면 상태라 조립 함수로는 못 잡는다. 두 장치가 사라지면 여기서 잡는다.
const component = readFileSync(new URL("../components/PromptCard.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/mission/[id]/page.tsx", import.meta.url), "utf8");
check(
  "카드가 미션마다 새로 만들어진다",
  /<PromptCard\s+key=\{mission\.id\}/.test(page),
  "page.tsx 의 key 프롭",
);
// 카드 머리말은 진행 방식 셋을 모두 처리해야 한다
for (const [tool, label] of Object.entries({
  human: "옮겨 적을 카드",
  chat: "AI 대화창에 붙여넣을 카드",
  agent: "클로드 코드에 붙여넣을 카드",
})) {
  check(
    `${tool} 카드 머리말`,
    new RegExp(`${tool}:\\s*"${label}"`).test(component),
    label,
  );
}
check(
  "머리말에 남은 갈래가 없다",
  (component.match(/Record<MissionTool, string>/g) ?? []).length === 1,
);
check(
  "저장값이 없으면 편집 상태를 비운다",
  component.includes("setEdited(localStorage.getItem(storageKey))"),
  "PromptCard.tsx 의 키 전환 처리",
);

// 9. 안내문 원문과 시딩 내용이 어긋나면 안 된다
const manuscript = readFileSync(
  new URL("../원고-실습콘텐츠-이승엽파트.md", import.meta.url),
  "utf8",
);
const seed = readFileSync(new URL("./seed.mjs", import.meta.url), "utf8");
const PHRASES = [
  "클로드(혹은 Chat GPT 등) 새 대화를 열어",
  "Github 커밋, 푸시까지 가고, 배포까지 갑니다",
  "코드의 리팩토링을 검토받고",
  "내 동료의 도구를 써 보고 남긴 한 줄",
  "남은 일 (추후 계획)",
];
// 프롬프트 카드 자체는 check-seed 가 원고와 글자까지 대조한다. 여기서는 안내문과 칸 이름만 본다.
for (const phrase of PHRASES) {
  check(`원고에 "${phrase.slice(0, 12)}…" 이 있다`, manuscript.includes(phrase));
  check(`시딩이 원고와 같다 — "${phrase.slice(0, 12)}…"`, seed.includes(phrase));
}

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
