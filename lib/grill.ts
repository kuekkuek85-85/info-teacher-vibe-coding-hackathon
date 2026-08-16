/** 한 번에 보낼 수 있는 글자 수. 아이디어와 역할을 합쳐서 센다 */
export const MAX_IDEA_CHARS = 2000;

/**
 * 아이디어를 캐묻는 쪽의 사람 됨됨이.
 * 답을 대신 정해 주면 참가자가 판단을 멈춘다. 질문만 하게 묶어 둔다.
 */
export function buildGrillPrompt(): string {
  return [
    "너는 교육용 바이브 코딩 웹 앱을 만들어 온 전문가다. 중고등학교 정보 교사가 반나절 만에 쓸 도구를 만드는 워크숍에서 아이디어를 검토한다.",
    "교실에서 실제로 돌아가는지, 반나절에 만들 수 있는지, 학생 정보를 다루다 사고가 나지 않는지를 본다.",
    "",
    "아래 아이디어를 캐물어라. 규칙은 이렇다.",
    "질문 3개만 낸다. 각 질문은 한 문장이고 60자를 넘기지 않는다.",
    "답을 대신 정해 주지 않는다. 무엇을 하라고 지시하지 말고 무엇이 흐린지 물어라.",
    "칭찬하지 않는다. 좋다, 훌륭하다 같은 말을 쓰지 않는다.",
    "이 다섯 자리 중 이 아이디어에서 가장 흐린 세 곳을 골라 묻는다. 진짜 병목인지, 누구의 문제인지, 이미 있는 도구로 되는 것은 아닌지, 반나절에 만들 수 있는지, 학생 개인정보나 안전에 걸리는 곳은 없는지.",
    "",
    "형식은 마크다운 번호 목록 세 줄이다. 이유, 요약, 인사말을 붙이지 않는다. 세 줄 말고 아무것도 쓰지 않는다.",
    "한국어로 쓴다.",
  ].join("\n");
}

/** 참가자가 적은 것을 캐물을 감으로 묶는다 */
export function buildGrillInput(idea: string, roles: string): string {
  const lines = ["## 아이디어 한 줄", idea.trim() || "(아직 적지 않았습니다)"];
  if (roles.trim()) {
    lines.push("", "## 이 도구의 사용자와 그 사람이 하는 일", roles.trim());
  }
  return lines.join("\n");
}

/** 화면에 내보낼 줄 수. 프롬프트가 지켜 주지 않을 때를 대비한다 */
export const MAX_LINES = 3;
/** 한 줄 길이. 이보다 길면 훑고 넘어갈 분량이 아니다 */
export const MAX_LINE_CHARS = 120;

/**
 * 답을 세 줄로 자른다.
 * 프롬프트에 적어 두어도 모델이 이유를 붙이거나 인사말을 얹을 때가 있다.
 * 참가자가 훑고 넘어갈 분량을 화면 쪽에서 못 박는다.
 */
export function trimToLines(reply: string): string {
  const all = reply
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  // 번호 목록만 남긴다. 제목과 맺음말은 여기서 떨어진다.
  const listed = all.filter((l) => /^(\d+[.)]|[-*])\s/.test(l));

  const picked = (listed.length > 0 ? listed : all)
    // 묻는 줄만 남긴다. 이유나 설명이 목록으로 와도 걸러진다.
    .filter((l) => /[?？]/.test(l))
    // 물음표에서 끊는다. 뒤에 붙은 이유가 여기서 떨어진다.
    .map((l) => l.slice(0, l.search(/[?？]/) + 1))
    // 물음표가 너무 뒤에 있으면 자르는 순간 질문이 아니게 된다. 그 줄은 버린다.
    .filter((l) => l.length <= MAX_LINE_CHARS)
    // 세 줄로 자르는 것은 맨 마지막이다. 먼저 자르면 앞의 긴 줄 때문에
    // 뒤에 있는 멀쩡한 질문까지 잃는다.
    .slice(0, MAX_LINES);

  return picked.join("\n");
}

/**
 * 캐물 것이 있는지 본다. 빈 아이디어를 보내면 질문이 허공을 짚는다.
 * 길이는 둘을 합쳐서 센다. 따로 재면 두 배가 들어간다.
 */
export function validateGrillInput(
  idea: unknown,
  roles: unknown,
): { idea: string; roles: string } | { error: string } {
  if (typeof idea !== "string" || !idea.trim()) {
    return { error: "아이디어 한 줄을 먼저 적어 주세요." };
  }
  if (roles !== undefined && typeof roles !== "string") {
    return { error: "보낸 값을 읽지 못했습니다. 다시 눌러 주세요." };
  }
  const text = roles ?? "";
  if (idea.length + text.length > MAX_IDEA_CHARS) {
    // 말없이 자르면 문장이 중간에서 끊긴 채로 캐물음이 나간다.
    return { error: `아이디어와 역할을 합쳐 ${MAX_IDEA_CHARS}자까지 보낼 수 있습니다.` };
  }
  return { idea, roles: text };
}
