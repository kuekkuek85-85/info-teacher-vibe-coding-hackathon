// 셔플 배정 로직 확인용 스크립트
// 실행: node scripts/check-pairing.ts
import { readFileSync } from "node:fs";
import { attendees, cameToday, seoulDay } from "../lib/attendance.ts";
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

// 오늘 온 사람만 짝을 짓는다. 안 온 사람이 섞이면 상대가 빈 자리를 마주한다
const TODAY = "2026-08-17";
const entered = {
  A: TODAY,
  B: TODAY,
  C: "2026-08-16", // 어제만 왔다
  D: undefined, // 온 적이 없다
  E: TODAY,
};
const came = attendees(["A", "B", "C", "D", "E"], entered, TODAY);
check("오늘 온 사람만 남는다", JSON.stringify(came) === '["A","B","E"]', came.join(","));
check("어제 온 사람은 빠진다", !came.includes("C"));
check("온 적 없는 사람은 빠진다", !came.includes("D"));
check("명단 순서를 지킨다", came[0] === "A" && came[2] === "E");

const r6 = pairUp(came, FALLBACK, noShuffle);
check("안 온 사람은 배정되지 않는다", !r6.has("C") && !r6.has("D"));
check("안 온 사람을 검토하지도 않는다", ![...r6.values()].some((v) => v === "C" || v === "D"));

check("날짜는 한국 시간으로 센다", seoulDay(new Date("2026-08-16T15:30:00Z")) === "2026-08-17",
  seoulDay(new Date("2026-08-16T15:30:00Z")));
check("자정 직전은 아직 어제다", seoulDay(new Date("2026-08-16T14:30:00Z")) === "2026-08-16",
  seoulDay(new Date("2026-08-16T14:30:00Z")));
check("형식은 YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(seoulDay(new Date("2026-01-05T00:00:00Z"))),
  seoulDay(new Date("2026-01-05T00:00:00Z")));
check("빈 값은 오늘이 아니다", !cameToday(undefined, TODAY) && !cameToday("", TODAY));
check("숫자가 와도 오늘이 아니다", !cameToday(20260817, TODAY));

// 화면과 배정이 같은 것을 봐야 한다
const admin = readFileSync(new URL("../app/api/admin/route.ts", import.meta.url), "utf8");
check("배정이 오늘 온 사람만 쓴다", admin.includes("const students = attendees("));
check("두 명 미만이면 막는다", admin.includes("students.length < 2"));
// 지난 배정이 남으면 오늘 빠진 사람에게 옛 상대가 붙어 있다
check("이번 배정 밖은 지운다", admin.includes("reviewTarget: FieldValue.delete()"));
check("지울 것도 트랜잭션 안에서 읽는다", admin.includes("const staleSnaps = await Promise.all"));

// 이틀짜리 워크숍이다. 어제 들어온 사람은 이름이 기기에 남아 입장 화면을 거치지 않는다
const attend = readFileSync(new URL("../app/api/attend/route.ts", import.meta.url), "utf8");
check("출석만 새로 찍는 길이 있다", attend.includes("tx.update(ref, { enteredDay: today"));
check("이름을 잡은 기기만 찍는다", attend.includes("data.ownerUid !== uid"));
check("토큰에서 uid 를 꺼낸다", attend.includes("verifyIdToken(idToken)"));
// 읽고 쓰는 사이에 셔플이 돌면 새 상대를 지울 수 있다
check("확인과 갱신이 한 묶음이다", attend.includes("adminDb.runTransaction"));
// 홈에만 두면 주소를 눌러 /mission/m3 로 바로 온 사람이 빠진다
const ping = readFileSync(new URL("../components/AttendPing.tsx", import.meta.url), "utf8");
check("돌아온 사람도 출석을 알린다", ping.includes('fetch("/api/attend"'));
check("이름이 없으면 아무것도 안 한다", ping.includes("if (!name) return;"));
// 약관과 방침, 강사 화면은 서약 없이 열린다. 거기서 돌면 안 된다
check("서약 전에는 찍지 않는다", ping.includes("if (!agreed || teacher) return;"));
check("강사 화면에서는 찍지 않는다", ping.includes('pathname?.startsWith("/teacher")'));
check("서약 직후에도 찍는다", ping.includes("addEventListener(CONSENT_CHANGED, read)"));
const layoutFile = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
check("어느 화면에서나 알린다", layoutFile.includes("<AttendPing />"));

// 이튿날 아침, 어제 짠 짝이 남아 있으면 대시보드와 m8 이 옛 상대를 가리킨다
check("날이 바뀌면 어제 짝을 지운다", attend.includes("reviewTarget: FieldValue.delete()"));
const enter = readFileSync(new URL("../app/api/enter/route.ts", import.meta.url), "utf8");
check("입장할 때도 어제 짝을 지운다", enter.includes("before.enteredDay !== enteredDay"));
check("입장할 때 날짜를 적는다", enter.includes("const enteredDay = seoulDay()"));
// 처음 들어오는 사람과 다시 들어오는 사람, 두 갈래 모두에 적어야 한다
check("두 갈래 모두에 적는다", (enter.match(/enteredDay/g) ?? []).length >= 3);
const teacher = readFileSync(new URL("../app/teacher/page.tsx", import.meta.url), "utf8");
check("대시보드 기본이 오늘만이다", teacher.includes("useState(true)") && teacher.includes("todayOnly"));
check("표가 걸러진 명단을 쓴다", teacher.includes("{shown.map((r) => {"));
check("전체를 다시 볼 수 있다", teacher.includes("전체 명단 보기"));
// 막힘·배포·발표 목록도 같은 명단을 봐야 화면이 어긋나지 않는다
check("곁 목록도 같은 명단을 쓴다", teacher.includes("const listed = Object.values(people).filter((p) => seen.has(p.name))"));
check("발표 순서도 걸러진 명단", teacher.includes("readmeOrder(listed)"));

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
