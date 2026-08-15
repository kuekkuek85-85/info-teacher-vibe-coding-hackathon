// 저장된 동료 검토를 확인한다. 실행: node scripts/check-reviews.mjs
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

const snap = await getFirestore(app).collection("reviews").get();
if (snap.empty) {
  console.log("저장된 검토가 없습니다.");
} else {
  for (const d of snap.docs) {
    const v = d.data();
    const checked = Object.entries(v.checklist ?? {})
      .filter(([, on]) => on)
      .map(([k]) => k);
    console.log(`${d.id} | ${v.reviewer} -> ${v.target}`);
    console.log(`  체크 ${checked.length}개: ${checked.join(", ")}`);
    console.log(`  코멘트: ${v.comment}`);
  }
}
console.log(`\n총 ${snap.size}건`);
