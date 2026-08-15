// firestore.rules 를 Firebase Rules API 로 직접 배포한다.
// firebase CLI 는 serviceusage 권한을 요구해서 서비스 계정만으로는 막힌다.
// 실행: node scripts/deploy-rules.mjs
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";

try {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // 셸 환경 변수를 쓴다
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\\n/g, "\n"),
    }),
  });

const source = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");

async function main() {
  const { access_token: token } = await app.options.credential.getAccessToken();
  const base = `https://firebaserules.googleapis.com/v1/projects/${projectId}`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const createRes = await fetch(`${base}/rulesets`, {
    method: "POST",
    headers,
    body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: source }] } }),
  });
  const ruleset = await createRes.json();
  if (!createRes.ok) {
    console.error("규칙을 만들지 못했습니다:", JSON.stringify(ruleset.error ?? ruleset, null, 2));
    process.exit(1);
  }
  console.log("규칙 생성:", ruleset.name);

  const releaseName = `projects/${projectId}/releases/cloud.firestore`;
  const relRes = await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ release: { name: releaseName, rulesetName: ruleset.name } }),
  });
  const release = await relRes.json();
  if (!relRes.ok) {
    console.error("배포하지 못했습니다:", JSON.stringify(release.error ?? release, null, 2));
    process.exit(1);
  }
  console.log("배포 완료:", release.name);
}

main().catch((e) => {
  console.error("실패:", e.message);
  process.exit(1);
});
