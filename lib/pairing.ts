/**
 * 학생들을 둘씩 상호 검토로 묶는다.
 * 홀수라 짝이 없는 한 명이 생기면 그 사람의 검토자로 예비 검토자를 넣는다.
 * 예비 검토자는 짝짓기 대상이 아니라서 두 번 배정될 일이 없다.
 * 반환값은 "검토하는 사람 → 검토받는 사람" 이다.
 */
export function pairUp(
  students: string[],
  fallbackReviewer: string | null,
  shuffle: (list: string[]) => string[] = defaultShuffle,
): Map<string, string> {
  // 예비 검토자가 학생 명단에 섞여 있으면 배정이 겹친다. 미리 걸러 낸다.
  const pool = shuffle(students.filter((s) => s !== fallbackReviewer));
  const assignment = new Map<string, string>();

  let i = 0;
  for (; i + 1 < pool.length; i += 2) {
    assignment.set(pool[i], pool[i + 1]);
    assignment.set(pool[i + 1], pool[i]);
  }

  if (i < pool.length) {
    const leftover = pool[i];
    // 남은 한 명도 누군가를 검토한다. 자기 자신은 고르지 않는다.
    const partner = pool.find((p) => p !== leftover);
    if (partner) assignment.set(leftover, partner);
    if (fallbackReviewer) assignment.set(fallbackReviewer, leftover);
  }

  return assignment;
}

function defaultShuffle(list: string[]): string[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
