// 리허설로 쌓인 참가자 데이터를 지운다. 명단·입장코드·미션은 남는다.
// 미션 열림 상태도 전부 닫는다.
// 실행: node scripts/reset-progress.mjs
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
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

const [progressSnap, reviewsSnap] = await Promise.all([
  db.collection("progress").get(),
  db.collection("reviews").get(),
]);

if (!process.argv.includes("--yes")) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `progress ${progressSnap.size}건과 reviews ${reviewsSnap.size}건을 지우고 미션을 전부 닫습니다. 계속할까요? (y/N) `,
  );
  rl.close();
  if (answer.trim().toLowerCase() !== "y") {
    console.log("아무것도 지우지 않았습니다.");
    process.exit(0);
  }
}

const batch = db.batch();
progressSnap.docs.forEach((d) => batch.delete(d.ref));
reviewsSnap.docs.forEach((d) => batch.delete(d.ref));
const missions = await db.collection("missions").get();
missions.docs.forEach((d) => batch.update(d.ref, { open: false }));
// 리허설에서 정한 발표 순서가 남아 있으면 당일 /present 에 그대로 뜬다.
batch.set(db.collection("config").doc("global"), { presentOrder: [] }, { merge: true });
await batch.commit();

console.log(
  `progress ${progressSnap.size}건, reviews ${reviewsSnap.size}건을 지웠습니다. 미션 ${missions.size}종을 닫고 발표 순서를 비웠습니다.`,
);
