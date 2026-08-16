// m8 에서 동료 도구를 여는 부분을 확인한다.
// 실행: node scripts/check-peer-tool.ts
import { readFileSync } from "node:fs";
import { peerTool } from "../lib/peerTool.ts";
import type { Progress } from "../lib/types.ts";

let failures = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

const withM7 = (
  status: "draft" | "submitted",
  data: Record<string, string>,
): Progress => ({
  ownerUid: "u",
  name: "수강생02",
  school: "○○중",
  role: "student",
  missions: { m7: { status, data } },
  currentStep: "m8",
  stuck: false,
});

const GOOD = {
  deploy_url: "https://example.vercel.app",
  repo_url: "https://github.com/kuekkuek85-85/info-teacher-vibe-coding-hackathon",
  remaining: "로그인은 아직 안 붙였습니다.",
};

// 1. 제출한 것만 보여 준다
const draft = peerTool(withM7("draft", GOOD));
check("제출 전에는 아무것도 안 넘긴다", !draft.submitted && !draft.deploy && !draft.repo);
check("제출 전에는 남은 일도 안 넘긴다", draft.remaining === null);

const done = peerTool(withM7("submitted", GOOD));
check("제출하면 배포 주소가 나온다", done.deploy === "https://example.vercel.app/", `${done.deploy}`);
check("제출하면 저장소가 나온다", done.repo === GOOD.repo_url, `${done.repo}`);
check("남은 일이 나온다", done.remaining === GOOD.remaining);

// 2. 상대가 아직 없거나 m7 자체가 없어도 터지지 않는다
const none = peerTool(null);
check("상대 문서가 없어도 빈 값", !none.submitted && !none.deploy && !none.repo);
const noM7 = peerTool({ ...withM7("submitted", GOOD), missions: {} });
check("m7 이 없어도 빈 값", !noM7.submitted);

// 3. 이상한 주소는 링크로 만들지 않는다
const bad = peerTool(
  withM7("submitted", {
    deploy_url: "javascript:alert(1)",
    repo_url: "https://evil.example.com/kuekkuek85-85",
    remaining: "  ",
  }),
);
check("javascript 주소는 거른다", bad.deploy === null, `${bad.deploy}`);
check("github 이 아닌 저장소는 거른다", bad.repo === null, `${bad.repo}`);
check("공백만 적은 남은 일은 비운다", bad.remaining === null);

// 4. 주소가 없어도 남은 일은 남는다
const onlyRemaining = peerTool(withM7("submitted", { remaining: "배포는 못 했습니다." }));
check(
  "주소가 없어도 남은 일은 보인다",
  onlyRemaining.submitted && !onlyRemaining.deploy && onlyRemaining.remaining === "배포는 못 했습니다.",
);

// 5. 화면 쪽 장치. 상대가 바뀌면 앞사람 링크가 남으면 안 된다
const component = readFileSync(
  new URL("../components/PeerToolLinks.tsx", import.meta.url),
  "utf8",
);
check(
  "상대가 바뀌면 이전 상대 정보를 비운다",
  /useEffect\(\(\) => \{\s*\/\/[^\n]*\n\s*setProgress\(null\);\s*setLoading\(true\);/.test(component),
  "PeerToolLinks.tsx 의 초기화",
);
check("불러오는 동안 따로 표시한다", component.includes("불러오는 중입니다."));
check(
  "구독이 끊기면 기다리는 표시에 머물지 않는다",
  component.includes("setFailed(true)") && component.includes("불러오지 못했습니다"),
);
check(
  "링크에 rel 을 붙인다",
  (component.match(/rel="noreferrer noopener"/g) ?? []).length === 2,
);

const page = readFileSync(new URL("../app/mission/[id]/page.tsx", import.meta.url), "utf8");
check(
  "m8 에서만 띄운다",
  /mission\.id === "m8" \? \(\s*<PeerToolLinks/.test(page),
  "page.tsx 의 분기",
);

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
