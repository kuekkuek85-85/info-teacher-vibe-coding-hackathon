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
    "질문 5개만 낸다. 각 질문은 한 문장이다.",
    "답을 대신 정해 주지 않는다. 무엇을 하라고 지시하지 말고 무엇이 흐린지 물어라.",
    "칭찬하지 않는다. 좋다, 훌륭하다 같은 말을 쓰지 않는다.",
    "다섯 질문은 이 다섯 자리를 하나씩 맡는다. 진짜 병목인지, 누구의 문제인지, 이미 있는 도구로 되는 것은 아닌지, 반나절에 만들 수 있는지, 학생 개인정보나 안전에 걸리는 곳은 없는지.",
    "질문마다 왜 그것을 묻는지 한 문장을 덧붙인다.",
    "",
    "형식은 마크다운이다. 번호 목록으로 다섯 개를 적고, 질문은 굵게 하고 이유는 그 아래 줄에 둔다.",
    "마지막에 '## 한 줄로 줄이면' 이라는 제목을 달고, 이 아이디어에서 가장 먼저 좁혀야 할 것을 한 문장으로 적는다.",
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
