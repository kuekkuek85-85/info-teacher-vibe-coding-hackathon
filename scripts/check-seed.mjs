// 시딩 콘텐츠가 계획대로인지 확인한다. Firebase 없이 구조만 본다.
// 실행: node scripts/check-seed.mjs
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./seed.mjs", import.meta.url), "utf8");
const start = src.indexOf("const missions = [");
const end = src.indexOf("// ─────────────────────────────────────────────────────────────\n// 3. 쓰기");
const body = src.slice(start + "const missions =".length, end).trim().replace(/;$/, "");
const missions = eval(body);

let failures = 0;
const check = (label, ok, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

const expected = {
  m1: { order: 1, fields: ["prep", "during", "assess", "feedback"], vis: "private", tool: "human" },
  m2: {
    order: 2,
    fields: ["oneline", "user", "grill_changed", "grill_kept"],
    vis: "public",
    tool: "human",
  },
  m3: {
    order: 3,
    fields: ["problem", "mvp", "context", "p1", "stack"],
    vis: "name",
    tool: "chat",
  },
  m4: { order: 4, fields: ["scenario", "wireframe", "test_design"], vis: "name", tool: "chat" },
  m5: { order: 5, fields: ["accepted", "rejected"], vis: "name", tool: "chat" },
  m6: { order: 6, fields: ["first_prompt", "red_count"], vis: "name", tool: "agent" },
  m7: {
    order: 7,
    fields: ["green_count", "deploy_url", "repo_url", "remaining"],
    vis: "public",
    tool: "agent",
  },
  m8: {
    order: 8,
    fields: ["accepted", "rejected", "commit_msg", "pushed", "peer_feedback"],
    vis: "name",
    tool: "agent",
  },
  m9: {
    order: 9,
    fields: ["readme_url", "demo_plan", "demo_data"],
    vis: "public",
    tool: "agent",
  },
  m10: {
    order: 10,
    fields: ["about_hackathon", "about_output", "about_subject", "overall"],
    vis: "name",
    tool: "human",
  },
};

check("미션 10종", missions.length === 10, `개수=${missions.length}`);

for (const [id, want] of Object.entries(expected)) {
  const m = missions.find((x) => x.id === id);
  if (!m) {
    check(`${id} 존재`, false);
    continue;
  }
  check(`${id} order`, m.order === want.order, `${m.order}`);
  check(
    `${id} 필드 키`,
    JSON.stringify(m.fields.map((f) => f.key)) === JSON.stringify(want.fields),
    m.fields.map((f) => f.key).join(","),
  );
  check(`${id} 공개 범위`, m.visibility === want.vis, m.visibility);
  // 진행 방식이 셋으로 갈린다. 화면 색과 카드 문구가 이 값을 따른다.
  check(`${id} 도구`, m.tool === want.tool, m.tool);
  check(`${id} 안내문 있음`, typeof m.guide === "string" && m.guide.length > 20);
  check(`${id} 잠긴 상태로 시작`, m.open === undefined, "시딩 시 open=false 로 강제");
}

// carryover 연결
const carry = {
  m3: [["m2", "oneline"]],
  m4: [["m3", "mvp"]],
  m5: [
    ["m4", "scenario"],
    ["m4", "wireframe"],
    ["m4", "test_design"],
  ],
  m6: [["m4", "test_design"]],
};
for (const [id, want] of Object.entries(carry)) {
  const m = missions.find((x) => x.id === id);
  const got = m.carryover.map((c) => [c.fromMission, c.fromKey]);
  check(`${id} carryover`, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
}

// 프롬프트 카드
check("m4 프롬프트 카드", missions.find((m) => m.id === "m4").promptCard?.includes("구현 계획을 만들어줘"));
// 실패 케이스를 "테스트가 실패하는 것" 으로 오해하기 쉽다. 카드가 직접 풀어 준다.
const m4card = missions.find((m) => m.id === "m4").promptCard ?? "";
check(
  "m4 카드가 정상·실패 케이스를 풀어 준다",
  m4card.includes("제대로 썼을 때") &&
    m4card.includes("비어 있을 때, 형식이 어긋날 때, 너무 많거나 적을 때"),
);
check("m4 카드에 케이스 예시가 있다", (m4card.match(/예\) "/g) ?? []).length === 2);
check(
  "m4 카드가 실패 유형을 강요하지 않는다",
  m4card.includes("이 도구에서 실제로 벌어질 실패 상황"),
);

// 카드는 원고 §B 원문을 그대로 옮긴 것이다. 한쪽만 고치면 여기서 잡힌다.
const manuscript = readFileSync(
  new URL("../원고-실습콘텐츠-이승엽파트.md", import.meta.url),
  "utf8",
);
const fences = [...manuscript.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) =>
  m[1].replace(/\r/g, "").trimEnd(),
);
const CARD_HEADS = {
  m4: "아래 PRD로 구현 계획을 만들어줘",
  m5: "너는 까다로운 소프트웨어 설계 리뷰어다",
  m8: "너는 까다로운 코드 리뷰어다",
};
for (const [id, head] of Object.entries(CARD_HEADS)) {
  const card = (missions.find((m) => m.id === id).promptCard ?? "")
    .replace(/\r/g, "")
    .trimEnd();
  const fromDoc = fences.find((f) => f.startsWith(head));
  check(`${id} 카드가 원고와 글자까지 같다`, fromDoc === card, fromDoc ? "" : "원고에서 못 찾음");
}
check("m5 프롬프트 카드", missions.find((m) => m.id === "m5").promptCard?.includes("설계 리뷰어"));
check("m8 프롬프트 카드", missions.find((m) => m.id === "m8").promptCard?.includes("코드 리뷰어"));

// m6 프리필
const m6 = missions.find((m) => m.id === "m6");
check("m6 프리필 대상", m6.prefill?.targetKey === "first_prompt");
check("m6 프리필 슬롯이 템플릿에 있음", m6.prefill?.template.includes(m6.prefill?.slot));
check("m6 프리필 출처", m6.prefill?.fromMission === "m4" && m6.prefill?.fromKey === "test_design");

// select 옵션
const pushed = missions.find((m) => m.id === "m8").fields.find((f) => f.key === "pushed");
check("m8 pushed 선택지", JSON.stringify(pushed.options) === JSON.stringify(["예", "아니오"]));

// 진행 시점. 1일차에 m1·m2 를 못 해서 2일차 아침으로 옮겼다.
// 안내문이 옛 일정으로 되돌아가면 여기서 잡힌다.
const m1 = missions.find((m) => m.id === "m1");
const m2 = missions.find((m) => m.id === "m2");
check("m1 세션이 2일차 아침", m1.session === "2일차 아침", m1.session);
check("m2 세션이 2일차 아침", m2.session === "2일차 아침", m2.session);
check(
  "m2 안내문에 숙제 표현이 없다",
  !/자기 전에|내일 아침|숙제/.test(m2.guide),
  m2.guide.slice(0, 30),
);
check(
  "m2 안내문이 다음 단계를 가리킨다",
  m2.guide.includes("다음 단계"),
  m2.guide.slice(-40),
);

// m2 캐묻기. 아이디어가 뭉툭한 채로 m3 에 넘어가면 PRD 도 뭉툭해진다.
// 카드를 복사해 옮기지 않고 화면에서 바로 받는다. 그래서 promptCard 가 없다.
check("m2 에 붙여넣을 카드가 없다", !m2.promptCard);
check("m2 안내가 버튼을 가리킨다", m2.guide.includes("뾰족하게 버튼"));
check("m2 안내가 시간을 못 박는다", m2.guide.includes("3분"));
check("m2 단계 자체는 사람이 적는다", m2.tool === "human", m2.tool);
check("m2 머리말이 버튼을 가리킨다", m2.toolLine?.includes("뾰족하게 버튼"));
check(
  "m2 가 바꾼 것과 안 바꾼 것을 남긴다",
  ["grill_changed", "grill_kept"].every((k) => m2.fields.some((f) => f.key === k)),
);

// 프롬프트 카드에 내 제출물이 채워지는지. 자리표시자와 slot 이 어긋나면 안 채워진다.
for (const [id, sources] of Object.entries({ m4: ["m3"], m5: ["m3", "m4"] })) {
  const m = missions.find((x) => x.id === id);
  const fill = m.promptFill;
  check(`${id} promptFill 있음`, Boolean(fill));
  check(
    `${id} slot 이 카드 안에 있다`,
    Boolean(fill) && m.promptCard.includes(fill.slot),
    fill?.slot,
  );
  check(
    `${id} 출처가 ${sources.join(",")}`,
    JSON.stringify(fill?.sources?.map((s) => s.mission)) === JSON.stringify(sources),
    JSON.stringify(fill?.sources?.map((s) => s.mission)),
  );
  // 출처로 지정한 키가 그 미션에 실제로 있어야 한다
  for (const s of fill?.sources ?? []) {
    const from = missions.find((x) => x.id === s.mission);
    const keys = from.fields.map((f) => f.key);
    check(
      `${id} 가 참조하는 ${s.mission} 키가 모두 존재`,
      s.keys.every((k) => keys.includes(k)),
      s.keys.filter((k) => !keys.includes(k)).join(",") || "누락 없음",
    );
  }
}

// 검토는 클로드가 아니어도 된다. 안내가 한 도구만 가리키면 안 된다.
const m5 = missions.find((m) => m.id === "m5");
check(
  "m5 안내가 다른 도구도 허용한다",
  m5.guide.includes("Chat GPT"),
  m5.guide.slice(0, 24),
);

// 구현·리팩토링 단계 안내
const m7 = missions.find((m) => m.id === "m7");
const m8 = missions.find((m) => m.id === "m8");
check("m7 안내가 커밋·푸시를 포함한다", m7.guide.includes("Github 커밋, 푸시까지"));
check(
  "m6 첫 지시문 칸에 예시가 있다",
  missions
    .find((m) => m.id === "m6")
    .fields.find((f) => f.key === "first_prompt")
    .placeholder?.startsWith("예)"),
);
check(
  "m7 남은 일 칸 이름",
  m7.fields.find((f) => f.key === "remaining").label === "남은 일 (추후 계획)",
);
check("m8 안내가 리팩토링으로 시작한다", m8.guide.startsWith("코드의 리팩토링을 검토받고"));
check("m8 안내에 지난 일정이 없다", !m8.guide.includes("오후 스프린트 3"));
check(
  "m8 동료 칸 이름",
  m8.fields.find((f) => f.key === "peer_feedback").label ===
    "내 동료의 도구를 써 보고 남긴 한 줄",
);

// m2 사용자 칸은 체크와 역할을 함께 받는다
const userField = m2.fields.find((f) => f.key === "user");
check("m2 사용자 칸이 역할 입력이다", userField.type === "roles", userField.type);
check(
  "m2 사용자 보기 셋",
  JSON.stringify(userField.options) === JSON.stringify(["학생", "교사", "학부모"]),
  JSON.stringify(userField.options),
);

// 발표와 회고
const m9 = missions.find((m) => m.id === "m9");
const m10 = missions.find((m) => m.id === "m10");
check("m9 가 발표 단계다", m9.stepLabel === "발표", m9.stepLabel);
check("m9 안내가 README 하나로 간다", m9.guide.includes("README 하나로"));
check("m10 이 회고 단계다", m10.stepLabel === "회고", m10.stepLabel);
check(
  "m10 이 네 방향을 묻는다",
  ["해커톤에 대해", "내 산출물에 대해", "정보 교과에 대해", "전반적인 성찰"].every((l) =>
    m10.fields.some((f) => f.label === l),
  ),
);

const m3problem = missions
  .find((m) => m.id === "m3")
  .fields.find((f) => f.key === "problem");
check(
  "m3 자리표시자에 어제가 없다",
  !m3problem.placeholder.includes("어제"),
  m3problem.placeholder,
);

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
