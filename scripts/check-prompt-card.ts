// 프롬프트 카드에 내 제출물이 제대로 들어가는지 확인한다.
// 실행: node scripts/check-prompt-card.ts
import { readFileSync } from "node:fs";
import { buildPromptText, liveData } from "../lib/promptCard.ts";
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

// 8. 저장 전에 적은 값도 화면이 바로 써야 한다. 저장을 기다리면 방금 적은 것이 빠진다.
const saved = withData({ problem: "저장된 문장", mvp: "저장된 MVP" });
const live = liveData(saved, "m3", { problem: "방금 적은 문장" });
check("얹은 값이 이긴다", live.problem === "방금 적은 문장");
check("안 얹은 칸은 저장된 값이 남는다", live.mvp === "저장된 MVP");
check("원본을 건드리지 않는다", saved.missions.m3.data.problem === "저장된 문장");
check("초안이 없으면 저장된 값만", liveData(saved, "m3", null).problem === "저장된 문장");
check("빈 초안도 마찬가지", liveData(saved, "m3", {}).mvp === "저장된 MVP");
// 진행 문서가 아직 없어도 방금 적은 것은 살아야 한다
check("문서가 없어도 적은 것은 남는다", liveData(null, "m3", { problem: "x" }).problem === "x");
check("문서도 초안도 없으면 빈 값", Object.keys(liveData(null, "m3", null)).length === 0);
check("적은 적 없는 미션이면 빈 값", Object.keys(liveData(saved, "m9", null)).length === 0);

// 9. 미션을 옮겨도 앞 카드에서 고친 내용이 따라오면 안 된다.
// 화면 상태라 조립 함수로는 못 잡는다. 두 장치가 사라지면 여기서 잡는다.
const component = readFileSync(new URL("../components/PromptCard.tsx", import.meta.url), "utf8");
// 미션 본문은 홈과 미션 화면이 함께 쓴다. 홈에서는 칸을 바꿔도 화면이 안 바뀌므로
// key 가 없으면 앞 미션의 카드가 그대로 남는다.
const detail = readFileSync(
  new URL("../components/MissionDetail.tsx", import.meta.url),
  "utf8",
);
check(
  "카드가 미션마다 새로 만들어진다",
  /<PromptCard\s+key=\{mission\.id\}/.test(detail),
  "MissionDetail 의 key 프롭",
);
check(
  "제출 양식도 미션마다 새로 만들어진다",
  /<MissionForm\s+key=\{mission\.id\}/.test(detail),
);
// 서버 응답이 늦는 사이에 적은 것을 늦게 온 스냅샷이 덮으면 안 된다
const form = readFileSync(new URL("../components/MissionForm.tsx", import.meta.url), "utf8");
check("초기화 전에 적은 것을 붙들어 둔다", form.includes("typed.current = next"));
check("늦게 온 값보다 적은 것이 이긴다", form.includes("Object.assign(base, typed.current)"));
// 저장은 data 를 통째로 덮어쓴다. 초기화 전에 올리면 앞서 적은 칸이 지워진다.
check("초기화 전에는 저장하지 않는다", form.includes("if (initialized.current) queue(next)"));
check(
  "초기화 뒤에 한꺼번에 올린다",
  form.includes("Object.keys(typed.current).length > 0) queue(base)"),
);
// 올리지 못하는 동안에도 잃지 않고, 빈 채로 제출되지도 않아야 한다
check("올리기 전에도 이 브라우저에 남긴다", form.includes("else backup(next)"));
check("서버 값을 받기 전에는 제출을 막는다", form.includes("disabled={submitting || !ready}"));
const save = readFileSync(new URL("../lib/useDebouncedSave.ts", import.meta.url), "utf8");
check("보관만 하는 길이 있다", save.includes("const backup = useCallback"));
check(
  "보관은 서버를 부르지 않는다",
  !save.slice(save.indexOf("const backup = useCallback"), save.indexOf("const flush")).includes(
    "setTimeout(run",
  ),
);
// 적는 순서가 있는 자리에서는 도구가 칸 사이에 선다
check("칸 사이에 끼울 수 있다", detail.includes('slotAfter={grill ? "user" : undefined}'));
check("미션을 옮기면 얹은 값을 비운다", detail.includes("setDraft(null), [mission.id]"));
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
