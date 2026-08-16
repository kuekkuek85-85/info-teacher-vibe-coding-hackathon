export interface RoleRow {
  option: string;
  checked: boolean;
  detail: string;
}

/**
 * 사용자와 역할을 한 칸에 담는다. 저장 형태는 화면에 보이는 그대로다.
 * [v] 학생: 답안을 사진으로 올린다
 * [ ] 학부모:
 */
export function parseRoles(value: string | undefined, options: string[]): RoleRow[] {
  const lines = (value ?? "").split("\n");
  return options.map((option) => {
    const line = lines.find((l) => l.replace(/^\[[^\]]*\]\s*/, "").startsWith(`${option}:`));
    if (!line) return { option, checked: false, detail: "" };
    return {
      option,
      checked: /^\[v\]/i.test(line.trim()),
      detail: line.slice(line.indexOf(`${option}:`) + option.length + 1).trim(),
    };
  });
}

/** 체크했거나 뭔가 적은 줄만 남긴다. 빈 줄로 프롬프트를 어지럽히지 않는다. */
export function formatRoles(rows: RoleRow[]): string {
  return rows
    .filter((r) => r.checked || r.detail.trim())
    .map((r) => `[${r.checked ? "v" : " "}] ${r.option}: ${r.detail.trim()}`)
    .join("\n");
}
