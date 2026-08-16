import type { Progress } from "./types";

const PLACEHOLDER = "(아직 비어 있습니다. 지우고 직접 적어 주세요)";

function pick(progress: Progress | null, mission: string, key: string): string {
  const v = progress?.missions?.[mission]?.data?.[key];
  return v?.trim() ? v.trim() : "";
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body || PLACEHOLDER}\n`;
}

/**
 * 참가자가 m2~m8 에 적어 온 내용을 모아 README 초안을 만든다.
 * 발표는 이 문서 하나로 한다. 5분 동안 위에서 아래로 읽으면
 * 문제, 만든 것, 써 보는 법, 만든 방법, 남은 일 순서가 된다.
 */
export function buildReadmeDraft(progress: Progress | null): string {
  const oneline = pick(progress, "m2", "oneline");
  const problem = pick(progress, "m3", "problem");
  const mvp = pick(progress, "m3", "mvp");
  const stack = pick(progress, "m3", "stack");
  const p1 = pick(progress, "m3", "p1");
  const scenario = pick(progress, "m4", "scenario");
  const testDesign = pick(progress, "m4", "test_design");
  const redCount = pick(progress, "m6", "red_count");
  const greenCount = pick(progress, "m7", "green_count");
  const deployUrl = pick(progress, "m7", "deploy_url");
  const repoUrl = pick(progress, "m7", "repo_url");
  const remaining = pick(progress, "m7", "remaining");
  const accepted = pick(progress, "m8", "accepted") || pick(progress, "m5", "accepted");
  const rejected = pick(progress, "m8", "rejected") || pick(progress, "m5", "rejected");

  const lines: string[] = [];

  lines.push("# (도구 이름을 적어 주세요)");
  lines.push("");
  // 빈 칸도 자리를 남긴다. 발표 전에 무엇을 채워야 하는지 보여야 한다.
  lines.push(`> ${oneline || PLACEHOLDER}`);
  lines.push("");

  lines.push("## 써 보기");
  lines.push("");
  lines.push(`- 배포: ${deployUrl || PLACEHOLDER}`);
  lines.push(`- 저장소: ${repoUrl || PLACEHOLDER}`);
  lines.push("");

  lines.push(section("어떤 문제를 풀었나", problem));
  lines.push(section("무엇이 되면 성공인가", mvp));
  lines.push(section("사용자가 겪는 흐름", scenario));

  lines.push("## 어떻게 만들었나");
  lines.push("");
  lines.push(`- 스택: ${stack || PLACEHOLDER}`);
  if (redCount || greenCount) {
    lines.push(
      `- 테스트: 실패 ${redCount || "?"}개로 시작해 ${greenCount || "?"}개를 통과시켰습니다`,
    );
  }
  lines.push("- 기획과 구현, 검토를 클로드와 했고 검토는 새 대화에서 받았습니다");
  lines.push("");

  lines.push("<details>");
  lines.push("<summary>테스트 케이스 설계</summary>");
  lines.push("");
  lines.push(testDesign || PLACEHOLDER);
  lines.push("");
  lines.push("</details>");
  lines.push("");

  lines.push("## 검토에서 정한 것");
  lines.push("");
  lines.push("받아들인 것");
  lines.push("");
  lines.push(accepted || PLACEHOLDER);
  lines.push("");
  lines.push("거부한 것과 이유");
  lines.push("");
  lines.push(rejected || PLACEHOLDER);
  lines.push("");

  lines.push(section("남은 일", remaining));
  lines.push(section("오늘은 만들지 않은 것", p1));

  lines.push("---");
  lines.push("");
  lines.push("2026 정보 교사 바이브 코딩 역량강화 워크숍에서 만들었습니다.");
  lines.push("");

  return lines.join("\n");
}

/**
 * m7 에 적은 저장소 주소가 https 깃허브인지 확인한다.
 * 참가자가 적은 값을 그대로 열면 엉뚱한 곳으로 갈 수 있다.
 */
export function githubRepoUrl(progress: Progress | null): string | null {
  return safeGithubUrl(pick(progress, "m7", "repo_url"));
}

export function safeGithubUrl(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return null;
    if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com")
      return null;
    return `https://github.com${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

/** 배포 주소도 http 나 https 만 연다. */
export function safeHttpUrl(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
