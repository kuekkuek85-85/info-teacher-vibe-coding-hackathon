// 확장자를 붙여야 검사 스크립트가 이 파일을 그대로 실행할 수 있다
import { safeGithubUrl, safeHttpUrl } from "./readme.ts";
import type { Progress } from "./types";

export interface PeerTool {
  /** m7 을 제출했는지. 저장만 해 둔 초안은 남에게 보이지 않는다 */
  submitted: boolean;
  deploy: string | null;
  repo: string | null;
  remaining: string | null;
}

/**
 * 동료가 제출한 m7 에서 열어 볼 것만 골라낸다.
 * 주소는 참가자가 적은 값이라 거른 뒤에만 넘긴다.
 */
export function peerTool(progress: Progress | null): PeerTool {
  const entry = progress?.missions?.m7;
  if (entry?.status !== "submitted") {
    return { submitted: false, deploy: null, repo: null, remaining: null };
  }
  const data = entry.data ?? {};
  return {
    submitted: true,
    deploy: safeHttpUrl(data.deploy_url ?? ""),
    repo: safeGithubUrl(data.repo_url ?? ""),
    remaining: data.remaining?.trim() || null,
  };
}
