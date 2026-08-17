// 사용자와 역할을 함께 받는 칸을 확인한다.
// 실행: node scripts/check-role-field.ts
import { formatRoles, parseRoles } from "../lib/roleField.ts";

let failures = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

const OPTIONS = ["학생", "교사", "학부모"];

// 1. 빈 값에서도 세 줄이 나온다
const empty = parseRoles("", OPTIONS);
check("보기 수만큼 줄이 나온다", empty.length === 3);
check("처음에는 아무것도 켜져 있지 않다", empty.every((r) => !r.checked && r.detail === ""));
check("빈 상태는 빈 문자열로 저장한다", formatRoles(empty) === "");

// 2. 켜고 적은 것만 저장한다
const one = [...empty];
one[0] = { option: "학생", checked: true, detail: "답안을 사진으로 올린다" };
const saved = formatRoles(one);
check("켠 줄만 남는다", saved === "[v] 학생: 답안을 사진으로 올린다", saved);

// 3. 저장한 값을 다시 읽으면 그대로다
const back = parseRoles(saved, OPTIONS);
check("체크가 살아 있다", back[0].checked === true);
check("설명이 살아 있다", back[0].detail === "답안을 사진으로 올린다");
check("건드리지 않은 줄은 그대로", !back[1].checked && back[2].detail === "");

// 4. 체크는 안 했어도 적은 것은 잃지 않는다
const typed = [...empty];
typed[2] = { option: "학부모", checked: false, detail: "결과만 본다" };
const kept = formatRoles(typed);
check("체크 없이 적어도 남는다", kept === "[ ] 학부모: 결과만 본다", kept);
check("다시 읽어도 남는다", parseRoles(kept, OPTIONS)[2].detail === "결과만 본다");

// 5. 여러 줄이 순서대로 붙는다
const all = OPTIONS.map((option, i) => ({
  option,
  checked: i !== 1,
  detail: `${option} 일`,
}));
const text = formatRoles(all);
check(
  "보기 순서대로 줄이 선다",
  text === "[v] 학생: 학생 일\n[ ] 교사: 교사 일\n[v] 학부모: 학부모 일",
  text,
);
const round = parseRoles(text, OPTIONS);
check(
  "여러 줄도 그대로 돌아온다",
  round[0].checked && !round[1].checked && round[2].checked,
);

// 6. 글자마다 저장하고 다시 읽는 칸이라, 방금 친 끝 공백이 살아남아야 띄어쓰기가 된다
const typing = [...empty];
typing[1] = { option: "교사", checked: true, detail: "수준별 " };
const midway = formatRoles(typing);
check("끝 공백을 그대로 담는다", midway === "[v] 교사: 수준별 ", JSON.stringify(midway));
check(
  "다시 읽어도 끝 공백이 남는다",
  parseRoles(midway, OPTIONS)[1].detail === "수준별 ",
  JSON.stringify(parseRoles(midway, OPTIONS)[1].detail),
);
// 한 글자씩 치는 동안 값이 어긋나지 않아야 한다
let sofar = "";
let store = "";
for (const ch of "수준별 문제 출제") {
  sofar += ch;
  const rows = parseRoles(store, OPTIONS);
  rows[1] = { ...rows[1], checked: true, detail: rows[1].detail + ch };
  store = formatRoles(rows);
}
check(
  "한 글자씩 쳐도 띄어쓰기가 남는다",
  parseRoles(store, OPTIONS)[1].detail === sofar,
  parseRoles(store, OPTIONS)[1].detail,
);
// 줄바꿈이 들어오면 형식이 깨진다. 한 칸으로 눕힌다
const multi = [...empty];
multi[0] = { option: "학생", checked: true, detail: "앞\n뒤" };
check("줄바꿈은 한 칸으로", formatRoles(multi) === "[v] 학생: 앞 뒤", formatRoles(multi));

// 7. 이름에 콜론이 섞인 옛 값이 와도 터지지 않는다
const messy = parseRoles("학생: 첫 줄: 두 번째 콜론", OPTIONS);
check("체크 표시가 없으면 꺼진 것으로 본다", messy[0].checked === false);
check("콜론 뒤 전체를 설명으로 본다", messy[0].detail === "첫 줄: 두 번째 콜론", messy[0].detail);

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
