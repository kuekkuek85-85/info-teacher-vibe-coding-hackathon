// README 초안과 링크 검증을 확인한다.
// 실행: node scripts/check-readme.ts
import { buildReadmeDraft, safeGithubUrl, safeHttpUrl } from "../lib/readme.ts";
import { readmeOrder, readmeRanks } from "../lib/readmeOrder.ts";
import type { Progress } from "../lib/types.ts";

let failures = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

const empty: Progress = {
  ownerUid: "u",
  name: "수강생01",
  school: "○○중",
  role: "student",
  missions: {},
  currentStep: "m1",
  stuck: false,
};

// 아무것도 제출하지 않아도 뼈대가 나와야 한다
const blank = buildReadmeDraft(empty);
const SECTIONS = [
  "## 써 보기",
  "## 어떤 문제를 풀었나",
  "## 무엇이 되면 성공인가",
  "## 사용자가 겪는 흐름",
  "## 어떻게 만들었나",
  "## 검토에서 정한 것",
  "## 남은 일",
  "## 오늘은 만들지 않은 것",
];
check(
  "빈 제출물에서도 모든 섹션이 남는다",
  SECTIONS.every((s) => blank.includes(s)),
  SECTIONS.filter((s) => !blank.includes(s)).join(",") || "누락 없음",
);
check("빈 칸에 안내 문구가 들어간다", blank.includes("아직 비어 있습니다"));

// 제출물이 있으면 값이 들어가야 한다
const filled: Progress = {
  ...empty,
  missions: {
    m2: { status: "submitted", data: { oneline: "형성평가를 바로 돌려주는 도구" } },
    m3: {
      status: "submitted",
      data: { problem: "일주일이 걸립니다", mvp: "수업 중에 봅니다", stack: "Next.js" },
    },
    m6: { status: "submitted", data: { red_count: "5" } },
    m7: {
      status: "submitted",
      data: {
        green_count: "5",
        deploy_url: "https://demo.vercel.app",
        repo_url: "https://github.com/user/repo",
      },
    },
  },
};
const draft = buildReadmeDraft(filled);
check("한 줄 요약이 인용으로 들어간다", draft.includes("> 형성평가를 바로 돌려주는 도구"));
check("배포와 저장소가 들어간다", draft.includes("https://demo.vercel.app"));
check("테스트 수치가 문장이 된다", draft.includes("실패 5개로 시작해 5개를"));

// 링크 검증
check("깃허브 주소 통과", safeGithubUrl("https://github.com/user/repo") === "https://github.com/user/repo");
check("끝 슬래시 정리", safeGithubUrl("https://github.com/user/repo/") === "https://github.com/user/repo");
check("www 도 허용", safeGithubUrl("https://www.github.com/u/r") === "https://github.com/u/r");
check("http 깃허브 거부", safeGithubUrl("http://github.com/user/repo") === null);
check("다른 호스트 거부", safeGithubUrl("https://github.com.evil.io/u/r") === null);
check("javascript 스킴 거부", safeGithubUrl("javascript:alert(1)") === null);
check("빈 값 거부", safeGithubUrl("") === null);

check("https 배포 주소 통과", safeHttpUrl("https://demo.vercel.app") !== null);
check("http 배포 주소 통과", safeHttpUrl("http://localhost:3000") !== null);
check("javascript 배포 주소 거부", safeHttpUrl("javascript:alert(1)") === null);
check("data 스킴 거부", safeHttpUrl("data:text/html,<script>") === null);

// 발표 순서는 README 를 올린 순서다
const person = (
  name: string,
  pushed: boolean,
  at: { seconds: number; nanoseconds: number } | null,
): Progress => ({ ...empty, name, readmePushed: pushed, readmePushedAt: at });

// 실제 크기의 시각으로 본다. 초와 나노초를 한 숫자로 합치면 여기서 어긋난다.
const NOW = 1_786_000_000;
const people: Progress[] = [
  person("다정", true, { seconds: NOW + 200, nanoseconds: 0 }),
  person("가온", true, { seconds: NOW, nanoseconds: 1 }),
  person("나래", true, { seconds: NOW, nanoseconds: 2 }),
  person("라온", false, null),
  person("마루", true, null), // 서버 시각이 아직 안 왔다
];
const order = readmeOrder(people);
check("올린 순서대로 줄 세운다", JSON.stringify(order) === '["가온","나래","다정"]', order.join(","));
check("표시하지 않은 사람은 빠진다", !order.includes("라온"));
check("시각이 아직 없으면 빠진다", !order.includes("마루"));
check("같은 초라도 나노초로 가른다", order.indexOf("가온") < order.indexOf("나래"));

const ranks = readmeRanks(people);
check("순번은 1부터", ranks.get("가온") === 1 && ranks.get("다정") === 3);
check("빠진 사람은 순번이 없다", !ranks.has("라온") && !ranks.has("마루"));
check("아무도 안 올렸으면 빈 목록", readmeOrder([]).length === 0);

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
