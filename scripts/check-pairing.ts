// 셔플 배정 로직 확인용 스크립트
// 실행: node scripts/check-pairing.ts
import { pairUp } from "../lib/pairing.ts";

const noShuffle = (l: string[]) => l;
let failures = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

const FALLBACK = "홍길동";

// 짝수 인원이면 예비 검토자는 나서지 않는다
const even = ["A", "B", "C", "D"];
const r1 = pairUp(even, FALLBACK, noShuffle);
check("짝수: 전원 배정", r1.size === 4, `size=${r1.size}`);
check("짝수: 상호 검토", r1.get("A") === "B" && r1.get("B") === "A");
check("짝수: 예비 검토자 미투입", !r1.has(FALLBACK));
check("짝수: 자기 자신 검토 없음", [...r1].every(([a, b]) => a !== b));

// 홀수 인원이면 예비 검토자가 남는 한 명을 맡는다
const odd = ["A", "B", "C", "D", "E"];
const r2 = pairUp(odd, FALLBACK, noShuffle);
check("홀수: 학생 전원이 검토자", odd.every((s) => r2.has(s)));
check("홀수: 예비 검토자가 남는 1명 담당", r2.get(FALLBACK) === "E", `${FALLBACK}->${r2.get(FALLBACK)}`);
check("홀수: 모든 학생이 검토를 받음", odd.every((s) => [...r2.values()].includes(s)));
check("홀수: 자기 자신 검토 없음", [...r2].every(([a, b]) => a !== b));

// 예비 검토자가 학생 명단에 섞여 들어간 경우
const mixed = ["A", "B", "C", "D", FALLBACK];
const r3 = pairUp(mixed, FALLBACK, noShuffle);
check("혼입: 짝짓기 풀에서 제외됨", r3.get("A") === "B" && r3.get("B") === "A");
check("혼입: 예비 검토자가 학생으로 검토받지 않음", ![...r3.values()].includes(FALLBACK),
  `받는사람=${[...r3.values()].join(",")}`);
check("혼입: 자기 자신 검토 없음", [...r3].every(([a, b]) => a !== b));

// 예비 검토자 없음
const r4 = pairUp(odd, null, noShuffle);
check("예비 없음: 남은 1명도 검토는 함", r4.get("E") === "A");
check("예비 없음: 없는 키 추가 안 함", r4.size === odd.length);

// 학생 1명
const r5 = pairUp(["A"], FALLBACK, noShuffle);
check("1명: 자기 자신 배정 안 함", r5.get("A") !== "A", `A->${r5.get("A")}`);
check("1명: 예비 검토자가 맡음", r5.get(FALLBACK) === "A");

// 무작위 셔플 100회
let selfReview = 0;
let unassigned = 0;
let notReviewed = 0;
for (let i = 0; i < 100; i++) {
  const list = ["A", "B", "C", "D", "E", "F", "G"];
  const r = pairUp(list, FALLBACK);
  for (const [a, b] of r) if (a === b) selfReview++;
  for (const s of list) {
    if (!r.has(s)) unassigned++;
    if (![...r.values()].includes(s)) notReviewed++;
  }
}
check("셔플 100회: 자기 자신 검토 0건", selfReview === 0, `발생=${selfReview}`);
check("셔플 100회: 미배정 0건", unassigned === 0, `발생=${unassigned}`);
check("셔플 100회: 검토 못 받은 사람 0건", notReviewed === 0, `발생=${notReviewed}`);

// 원본 배열을 건드리지 않는다
const original = ["A", "B", "C"];
const copy = [...original];
pairUp(original, FALLBACK);
check("원본 배열 보존", JSON.stringify(original) === JSON.stringify(copy));

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
