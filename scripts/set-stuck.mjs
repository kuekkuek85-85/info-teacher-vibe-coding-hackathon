// 리허설용: 특정 참가자를 막힌 상태로 만든다.
// 실행: node scripts/set-stuck.mjs 수강생01
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

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

const name = process.argv[2];
if (!name) {
  console.error("이름을 넣어 주세요. 예: node scripts/set-stuck.mjs 수강생01");
  process.exit(1);
}

const db = getFirestore(app);

// 오타로 없는 이름을 넣으면 껍데기 문서가 생겨 광장에 유령이 뜬다.
const roster = await db.collection("roster").doc(name).get();
if (!roster.exists) {
  console.error(`${name} 은 명단에 없습니다. 이름을 확인해 주세요.`);
  process.exit(1);
}

const progress = await db.collection("progress").doc(name).get();
if (!progress.exists) {
  console.error(`${name} 이 아직 입장하지 않았습니다. 입장한 뒤에 다시 실행해 주세요.`);
  process.exit(1);
}

await progress.ref.update({ stuck: true, stuckAt: FieldValue.serverTimestamp() });

console.log(`${name} 을 막힌 상태로 바꿨습니다.`);
