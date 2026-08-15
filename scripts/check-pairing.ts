// 셔플 배정 로직 확인용 스크립트
// 실행: node scripts/check-pairing.ts
import { pairUp } from "../lib/pairing.ts";

const noShuffle = (l: string[]) => l;
let failures = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

// 짝수 인원
const even = ["A", "B", "C", "D"];
const r1 = pairUp(even, "강사", noShuffle);
check("짝수: 전원 배정", r1.size === 4, `size=${r1.size}`);
check("짝수: 상호 검토", r1.get("A") === "B" && r1.get("B") === "A");
check("짝수: 강사 미포함", !r1.has("강사"));
check("짝수: 자기 자신 검토 없음", [...r1].every(([a, b]) => a !== b));

// 홀수 인원
const odd = ["A", "B", "C", "D", "E"];
const r2 = pairUp(odd, "강사", noShuffle);
check("홀수: 학생 전원이 검토자", odd.every((s) => r2.has(s)));
check("홀수: 강사가 남은 1명의 검토자", r2.get("강사") === "E", `강사->${r2.get("강사")}`);
check("홀수: 모든 학생이 검토를 받음", odd.every((s) => [...r2.values()].includes(s)));
check("홀수: 자기 자신 검토 없음", [...r2].every(([a, b]) => a !== b));

// 홀수 + 강사 없음
const r3 = pairUp(odd, null, noShuffle);
check("강사 없음: 남은 1명도 검토는 함", r3.get("E") === "A");
check("강사 없음: 강사 키 없음", ![...r3.keys()].includes("강사"));

// 1명
const r4 = pairUp(["A"], "강사", noShuffle);
check("1명: 자기 자신 배정 안 함", r4.get("A") !== "A", `A->${r4.get("A")}`);

// 무작위 셔플 100회
let selfReview = 0;
let unassigned = 0;
for (let i = 0; i < 100; i++) {
  const list = ["A", "B", "C", "D", "E", "F", "G"];
  const r = pairUp(list, "강사");
  for (const [a, b] of r) if (a === b) selfReview++;
  for (const s of list) if (!r.has(s)) unassigned++;
}
check("셔플 100회: 자기 자신 검토 0건", selfReview === 0, `발생=${selfReview}`);
check("셔플 100회: 미배정 0건", unassigned === 0, `발생=${unassigned}`);

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
