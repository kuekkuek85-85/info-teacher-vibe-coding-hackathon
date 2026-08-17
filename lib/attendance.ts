/**
 * 오늘 온 사람만 센다.
 *
 * 명단에는 있지만 못 오는 사람이 있다. 그 사람까지 짝을 지으면
 * 검토를 기다리는 사람이 빈 자리를 마주한다. 대시보드도 오지 않은 줄로 길어진다.
 *
 * 하루의 기준은 한국 시간이다. 서버가 어디에 있든 같은 날을 가리켜야 한다.
 */
const SEOUL = "Asia/Seoul";

/** 한국 시간 기준 날짜. "2026-08-17" 처럼 준다 */
export function seoulDay(at: Date = new Date()): string {
  // en-CA 는 YYYY-MM-DD 로 준다. 직접 자르는 것보다 어긋날 데가 적다.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** 저장된 입장 날짜가 오늘인지 */
export function cameToday(enteredDay: unknown, today: string = seoulDay()): boolean {
  return typeof enteredDay === "string" && enteredDay === today;
}

/**
 * 오늘 온 사람만 남긴다. 이름 목록으로 준다.
 * 온 적이 없는 사람의 문서는 아예 없거나 enteredDay 가 비어 있다.
 */
export function attendees(
  names: string[],
  entered: Record<string, unknown>,
  today: string = seoulDay(),
): string[] {
  return names.filter((name) => cameToday(entered[name], today));
}
