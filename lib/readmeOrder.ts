import type { Progress } from "./types";

interface Stamp {
  seconds: number;
  nanoseconds: number;
}

/** 서버가 찍은 시각. 아직 안 정해졌으면 null 이 온다. */
function pushedAt(p: Progress): Stamp | null {
  const t = p.readmePushedAt as
    | { seconds?: number; nanoseconds?: number }
    | null
    | undefined;
  if (!t || typeof t.seconds !== "number") return null;
  return { seconds: t.seconds, nanoseconds: t.nanoseconds ?? 0 };
}

/**
 * 초를 먼저 보고 같을 때만 나노초를 본다.
 * 둘을 한 숫자로 합치면 자릿수를 넘겨 같은 초끼리 순서가 흐트러진다.
 */
function earlier(a: Stamp, b: Stamp): number {
  return a.seconds !== b.seconds ? a.seconds - b.seconds : a.nanoseconds - b.nanoseconds;
}

/**
 * README 를 올렸다고 표시한 순서대로 이름을 낸다. 발표 순서가 된다.
 * 표시하지 않았거나 시각이 아직 안 온 사람은 빠진다.
 */
export function readmeOrder(people: Progress[]): string[] {
  return people
    .map((p) => ({ name: p.name, at: p.readmePushed === true ? pushedAt(p) : null }))
    .filter((x): x is { name: string; at: Stamp } => x.at !== null)
    .sort((a, b) => earlier(a.at, b.at))
    .map((x) => x.name);
}

/** 이름별 순번. 1 부터 센다. */
export function readmeRanks(people: Progress[]): Map<string, number> {
  return new Map(readmeOrder(people).map((name, i) => [name, i + 1]));
}
