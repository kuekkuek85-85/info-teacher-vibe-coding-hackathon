// 예비 검토자 검증이 동작하는지 확인한다.
// 라우트가 실제로 쓰는 함수를 그대로 불러 시험한다. 복제본을 만들지 않는다.
// 실행: node scripts/check-fallback-guard.ts
import { resolveFallbackReviewer } from "../lib/fallbackReviewer.ts";
import type { RosterEntry } from "../lib/types.ts";

let failures = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

const roster: RosterEntry[] = [
  ...Array.from({ length: 17 }, (_, i) => ({
    name: `수강생${i + 1}`,
    school: "",
    role: "student" as const,
  })),
  { name: "이승엽", school: "", role: "staff" as const },
  { name: "홍길동", school: "", role: "staff" as const },
];
const students = roster.filter((r) => r.role === "student").map((r) => r.name);
const evenStudents = students.slice(0, 16);

const a = resolveFallbackReviewer(roster, students, "홍길동");
check("홀수 + 올바른 설정: 통과", a.ok && a.reviewer === "홍길동", a.ok ? `${a.reviewer}` : a.message);

const b = resolveFallbackReviewer(roster, students, "없는사람");
check("홀수 + 명단에 없는 이름: 중단", !b.ok, b.ok ? "" : b.message);

const c = resolveFallbackReviewer(roster, students, "");
check("홀수 + 설정 없음: 중단", !c.ok, c.ok ? "" : c.message);

const d = resolveFallbackReviewer(roster, students, undefined);
check("홀수 + 값이 undefined: 중단", !d.ok, d.ok ? "" : d.message);

const e = resolveFallbackReviewer(roster, students, "   ");
check("홀수 + 공백만: 중단", !e.ok, e.ok ? "" : e.message);

const f = resolveFallbackReviewer(roster, students, "수강생1");
check("홀수 + 학생을 지정: 중단", !f.ok, f.ok ? "" : f.message);

const g = resolveFallbackReviewer(roster, students, "이승엽");
check("홀수 + 다른 강사 지정: 통과", g.ok && g.reviewer === "이승엽", g.ok ? `${g.reviewer}` : g.message);

const h = resolveFallbackReviewer(roster, evenStudents, "");
check("짝수: 설정이 비어도 진행", h.ok, "예비 검토자가 필요 없는 상황");

// 이전에 쓰던 INSTRUCTOR_NAME 으로는 우회되지 않아야 한다
process.env.INSTRUCTOR_NAME = "이승엽";
const i = resolveFallbackReviewer(roster, students, process.env.FALLBACK_REVIEWER_NAME);
check(
  "INSTRUCTOR_NAME 만 있으면 우회되지 않음",
  !i.ok,
  i.ok ? `우회됨: ${i.reviewer}` : i.message,
);

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
