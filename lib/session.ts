const NAME_KEY = "basecamp:name";
const ROLE_KEY = "basecamp:role";
const SCHOOL_KEY = "basecamp:school";

export function getSavedName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NAME_KEY);
}

export function getSavedRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}

export function getSavedSchool(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SCHOOL_KEY);
}

export function saveSession(name: string, role: string, school: string) {
  localStorage.setItem(NAME_KEY, name);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(SCHOOL_KEY, school);
}

export function clearSession() {
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(SCHOOL_KEY);
}
