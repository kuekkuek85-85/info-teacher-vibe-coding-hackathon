/**
 * 학생들을 둘씩 상호 검토로 묶는다.
 * 홀수면 남는 한 명은 다른 학생 하나를 검토하고, 그 사람의 검토자로 강사가 들어간다.
 * 반환값은 "검토하는 사람 → 검토받는 사람" 이다.
 */
export function pairUp(
  students: string[],
  instructor: string | null,
  shuffle: (list: string[]) => string[] = defaultShuffle,
): Map<string, string> {
  const order = shuffle([...students]);
  const assignment = new Map<string, string>();

  let i = 0;
  for (; i + 1 < order.length; i += 2) {
    assignment.set(order[i], order[i + 1]);
    assignment.set(order[i + 1], order[i]);
  }

  if (i < order.length) {
    const leftover = order[i];
    // 자기 자신을 검토하지 않도록 다른 사람을 고른다. 학생이 한 명뿐이면 검토할 상대가 없다.
    const partner = order.find((p) => p !== leftover);
    if (partner) assignment.set(leftover, partner);
    if (instructor && instructor !== leftover) assignment.set(instructor, leftover);
  }

  return assignment;
}

function defaultShuffle(list: string[]): string[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
