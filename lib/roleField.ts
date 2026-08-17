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
      // trim 을 걸면 안 된다. 글자마다 저장하고 다시 읽는 칸이라
      // 방금 친 끝 공백이 그때그때 지워져 띄어쓰기를 할 수 없다.
      // 콜론 뒤 구분용 한 칸만 떼고 나머지는 적은 그대로 돌려준다.
      detail: line.slice(line.indexOf(`${option}:`) + option.length + 1).replace(/^ /, ""),
    };
  });
}

/** 체크했거나 뭔가 적은 줄만 남긴다. 빈 줄로 프롬프트를 어지럽히지 않는다. */
export function formatRoles(rows: RoleRow[]): string {
  return rows
    .filter((r) => r.checked || r.detail.trim())
    // 적은 그대로 담는다. 줄바꿈만 한 칸으로 바꾼다. 줄이 나뉘면 형식이 깨진다.
    .map((r) => `[${r.checked ? "v" : " "}] ${r.option}: ${r.detail.replace(/\r?\n/g, " ")}`)
    .join("\n");
}
