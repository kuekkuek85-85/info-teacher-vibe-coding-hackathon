// 셔플 배정 결과를 확인한다. 실행: node scripts/check-assignment.mjs
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

try {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\\n/g, "\n"),
    }),
  });
const db = getFirestore(app);

const [progressSnap, rosterSnap] = await Promise.all([
  db.collection("progress").get(),
  db.collection("roster").get(),
]);

const roster = rosterSnap.docs.map((d) => d.data());
const students = roster.filter((r) => r.role === "student").map((r) => r.name);
const instructor = process.env.INSTRUCTOR_NAME || "이승엽";

const assign = new Map();
for (const d of progressSnap.docs) {
  const t = d.data().reviewTarget;
  if (t) assign.set(d.id, t);
}

let failures = 0;
const check = (label, ok, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

check("학생 전원이 검토자", students.every((s) => assign.has(s)),
  `배정=${students.filter((s) => assign.has(s)).length}/${students.length}`);
check("학생 전원이 검토를 받음", students.every((s) => [...assign.values()].includes(s)));
check("자기 자신 검토 없음", [...assign].every(([a, b]) => a !== b));
check("강사가 검토자로 들어감", assign.has(instructor), `${instructor}->${assign.get(instructor)}`);
check("ownerUid 보존", progressSnap.docs.every((d) => {
  const v = d.data();
  return v.ownerUid !== undefined;
}), "입장한 사람의 소유권이 남아 있는지");

const entered = progressSnap.docs.filter((d) => d.data().ownerUid);
console.log(`\n입장한 사람: ${entered.map((d) => d.id).join(", ") || "없음"}`);
console.log(`배정 총계: ${assign.size}건`);
console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
