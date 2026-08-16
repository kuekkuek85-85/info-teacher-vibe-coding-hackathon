const NAME_KEY = "basecamp:name";
const ROLE_KEY = "basecamp:role";
const SCHOOL_KEY = "basecamp:school";

/**
 * 브라우저 설정이나 사생활 보호 모드에서 localStorage 접근이 예외를 던진다.
 * 읽기만 되고 쓰기가 막히는 경우도 있다. 그래서 이번 접속 동안의 값은
 * 메모리를 진실로 삼는다. 저장소는 새로고침을 견디게 하는 보조다.
 *
 * 이렇게 하지 않으면 나가기를 눌렀는데 삭제가 실패해, 페이지를 옮길 때
 * 지운 이름이 되살아난다. 남의 칸에 글을 쓰게 되는 사고다.
 */
const memory = new Map<string, string>();
/** 이번 접속에서 지운 키. 저장소에 값이 남아 있어도 되살리지 않는다. */
const cleared = new Set<string>();

/**
 * 지울 수 없는 저장소에 남은 값은 믿지 않는다.
 * 나가기를 눌러도 지워지지 않으니, 새로고침하면 앞사람 이름으로 들어가게 된다.
 * 공유 기기에서 남의 칸에 글을 쓰는 사고가 여기서 난다.
 */
function canTrustStorage(): boolean {
  try {
    const probe = "basecamp:probe";
    window.localStorage.setItem(probe, "1");
    // 쓰기를 조용히 무시하는 저장소가 있다. 값이 들어갔는지 먼저 본다.
    if (window.localStorage.getItem(probe) !== "1") return false;
    window.localStorage.removeItem(probe);
    return window.localStorage.getItem(probe) === null;
  } catch {
    return false;
  }
}

function readKey(key: string): string | null {
  if (typeof window === "undefined") return null;
  // 이번 접속에서 정한 값이 가장 정확하다
  const held = memory.get(key);
  if (held !== undefined) return held;
  if (cleared.has(key)) return null;
  if (!canTrustStorage()) return null;
  try {
    const stored = window.localStorage.getItem(key);
    // 한 번 복원했으면 메모리에 못박는다. 다른 탭이 저장소를 바꿔도
    // 이 탭에서 쓰던 사람이 도중에 바뀌지 않는다.
    if (stored !== null) memory.set(key, stored);
    return stored;
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string) {
  memory.set(key, value);
  cleared.delete(key);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 새로고침하면 다시 입장해야 한다
  }
}

function removeKey(key: string) {
  memory.delete(key);
  cleared.add(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // 지우지 못해도 cleared 표식이 되살아나는 것을 막는다
  }
}

/** 저장소에 남길 수 있는지. 입장 화면에서 안내할 때 쓴다. */
export function isPersistent(): boolean {
  if (typeof window === "undefined") return true;
  return canTrustStorage();
}

export function getSavedName(): string | null {
  return readKey(NAME_KEY);
}

export function getSavedRole(): string | null {
  return readKey(ROLE_KEY);
}

export function getSavedSchool(): string | null {
  return readKey(SCHOOL_KEY);
}

export function saveSession(name: string, role: string, school: string) {
  writeKey(NAME_KEY, name);
  writeKey(ROLE_KEY, role);
  writeKey(SCHOOL_KEY, school);
}

export function clearSession() {
  removeKey(NAME_KEY);
  removeKey(ROLE_KEY);
  removeKey(SCHOOL_KEY);
}

const CASES_SEEN_KEY = "basecamp:casesSeen:v1";

/** 사례 팝업을 이미 닫았는지. 저장소가 막혀도 이번 접속 동안은 기억한다. */
export function hasSeenCases(): boolean {
  return readKey(CASES_SEEN_KEY) !== null;
}

export function markCasesSeen() {
  writeKey(CASES_SEEN_KEY, "1");
}
