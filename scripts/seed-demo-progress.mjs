// 리허설용: 한 사람의 m2~m8 제출물을 채워 README 초안을 시험한다.
// 실행: node scripts/seed-demo-progress.mjs 수강생01
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

const name = process.argv[2];
if (!name) {
  console.error("이름을 넣어 주세요. 예: node scripts/seed-demo-progress.mjs 수강생01");
  process.exit(1);
}

const entry = (data) => ({ status: "submitted", data });

const db = getFirestore(app);

// 이름을 잘못 적으면 소유권 없는 유령 문서가 생겨 그 사람이 저장을 못 하게 된다.
const roster = await db.collection("roster").doc(name).get();
if (!roster.exists) {
  console.error(`${name} 은 명단에 없습니다. 이름을 확인해 주세요.`);
  process.exit(1);
}
const target = await db.collection("progress").doc(name).get();
if (!target.exists) {
  console.error(`${name} 이 아직 입장하지 않았습니다. 입장한 뒤에 다시 실행해 주세요.`);
  process.exit(1);
}
// 셔플이 미리 만들어 둔 골격 문서에는 ownerUid 가 없다. 그건 입장한 것이 아니다.
if (!target.data()?.ownerUid) {
  console.error(`${name} 은 배정 골격만 있고 아직 입장하지 않았습니다.`);
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error(
    `${name} 의 m2~m8 제출물을 덮어씁니다. 실제 참가자 데이터라면 지금 멈추세요.`,
  );
  console.error("계속하려면 --yes 를 붙여 다시 실행해 주세요.");
  process.exit(1);
}

await db
  .collection("progress")
  .doc(name)
  .set(
    {
      missions: {
        m2: entry({ oneline: "형성평가 결과를 수업 중에 바로 돌려주는 도구", user: "교사" }),
        m3: entry({
          problem: "형성평가를 걷어 채점하고 돌려주기까지 일주일이 걸립니다.",
          mvp: "수업이 끝나기 전에 학생이 자기 결과를 본다면 성공입니다.",
          context: "중2 정보, 25명 한 반, 크롬북 사용",
          p1: "문항 은행과 통계 그래프는 오늘 만들지 않습니다.",
          stack: "Next.js + Firebase + Vercel",
        }),
        m4: entry({
          scenario: "학생이 링크로 들어와 다섯 문항을 풀고 제출하면 바로 정오답을 봅니다.",
          wireframe: "[문항 화면] 문제 / 보기 4개 / 제출",
          test_design: "정상: 제출하면 결과가 보인다 / 실패: 빈 답으로 제출하면 막힌다",
        }),
        m6: entry({ first_prompt: "실패하는 테스트부터 작성해줘", red_count: "5" }),
        m7: entry({
          green_count: "5",
          deploy_url: "https://quick-quiz-demo.vercel.app",
          repo_url: "https://github.com/kuekkuek85-85/quick-quiz-demo",
          remaining: "문항 편집 화면, 반별 분리, 결과 내보내기",
        }),
        m8: entry({
          accepted: "빈 답 검사를 서버에서도 하도록 고쳤습니다.",
          rejected: "문항 캐싱은 거부했습니다. 25명 규모에서는 필요 없습니다.",
          commit_msg: "feat: 형성평가 즉시 채점",
          pushed: "예",
        }),
      },
    },
    { merge: true },
  );

console.log(`${name} 의 m2~m8 제출물을 채웠습니다.`);
