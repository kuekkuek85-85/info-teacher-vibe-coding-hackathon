import type { RosterEntry } from "./types";

export type FallbackCheck =
  | { ok: true; reviewer: string | null }
  | { ok: false; message: string };

/**
 * 홀수라 짝이 없는 한 명을 검토할 예비 검토자를 고른다.
 * 조용히 다른 사람으로 대체하면 엉뚱한 강사가 배정되므로 맞지 않으면 멈춘다.
 * 짝수일 때는 예비 검토자가 필요 없어 설정이 비어 있어도 통과시킨다.
 */
export function resolveFallbackReviewer(
  roster: RosterEntry[],
  students: string[],
  fallbackName: string | undefined,
): FallbackCheck {
  const name = (fallbackName ?? "").trim();
  const entry = roster.find((r) => r.name === name);

  if (students.length % 2 === 0) {
    return { ok: true, reviewer: entry?.name ?? null };
  }

  if (!name) {
    return {
      ok: false,
      message:
        "학생이 홀수인데 예비 검토자가 정해져 있지 않습니다. FALLBACK_REVIEWER_NAME 을 설정해 주세요.",
    };
  }
  if (!entry) {
    return {
      ok: false,
      message: `예비 검토자 ${name} 이 명단에 없습니다. 시딩을 확인해 주세요.`,
    };
  }
  if (entry.role !== "staff") {
    return {
      ok: false,
      message: `예비 검토자 ${name} 의 역할이 staff 여야 합니다. 지금은 학생이라 배정이 겹칩니다.`,
    };
  }

  return { ok: true, reviewer: entry.name };
}
