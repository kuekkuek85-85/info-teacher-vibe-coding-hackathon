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
  m1: { order: 1, fields: ["prep", "during", "assess", "feedback"], vis: "private" },
  m2: { order: 2, fields: ["oneline", "user"], vis: "public" },
  m3: { order: 3, fields: ["problem", "mvp", "context", "p1", "stack"], vis: "name" },
  m4: { order: 4, fields: ["scenario", "wireframe", "test_design"], vis: "name" },
  m5: { order: 5, fields: ["accepted", "rejected"], vis: "name" },
  m6: { order: 6, fields: ["first_prompt", "red_count"], vis: "name" },
  m7: { order: 7, fields: ["green_count", "deploy_url", "repo_url", "remaining"], vis: "public" },
  m8: {
    order: 8,
    fields: ["accepted", "rejected", "commit_msg", "pushed", "peer_feedback"],
    vis: "name",
  },
};

check("미션 8종", missions.length === 8, `개수=${missions.length}`);

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

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
