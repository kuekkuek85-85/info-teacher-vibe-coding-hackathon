import type { Mission } from "./types";

export interface TutorTurn {
  role: "user" | "model";
  text: string;
}

/** 한 번에 보낼 수 있는 글자 수. 카드 전문을 통째로 던지지 못하게 막는다 */
export const MAX_TURN_CHARS = 2000;
/** 들고 갈 대화 길이. 넘으면 앞을 자른다 */
export const MAX_TURNS = 20;
/** 한 사람이 이 시간 안에 보낼 수 있는 횟수 */
export const RATE_WINDOW_MS = 5 * 60 * 1000;
export const RATE_LIMIT = 20;

/**
 * 앞에서부터 시도한다. 모델이 내려가거나(404) 몰려서 막히면(429·503) 다음으로 넘어간다.
 * 하나에 매달리면 워크숍 도중에 통째로 멈춘다.
 */
export const MODEL_CHAIN = [
  // 2026-08-16 에 실제로 재 본 응답 시간 순이다. 수업 중에는 기다림이 곧 이탈이다.
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

/** 다음 모델로 넘어갈 상태인지. 그 외의 실패는 모델을 바꿔도 그대로다 */
export function shouldTryNextModel(status: number): boolean {
  return status === 404 || status === 429 || status === 503;
}

/**
 * 지정한 모델, 지난번에 답한 모델 순으로 앞에 세운다.
 * 막힌 모델을 매번 먼저 두드리면 참가자가 그만큼 기다린다.
 */
export function modelsToTry(configured?: string, lastGood?: string | null): string[] {
  const front = [configured, lastGood]
    .map((m) => (m ?? "").trim())
    .filter(Boolean)
    .filter((m, i, a) => a.indexOf(m) === i);
  return [...front, ...MODEL_CHAIN.filter((m) => !front.includes(m))];
}

const TOOL_LINE: Record<string, string> = {
  human: "이 단계는 참가자가 AI 없이 직접 적는다. 대신 써 주지 말고 떠올릴 질문을 준다.",
  chat: "이 단계는 클로드나 Chat GPT 대화창으로 한다.",
  agent: "이 단계는 클로드 코드로 한다. 대화창이 아니라 코드를 직접 고치는 도구다.",
};

/**
 * 튜터가 지금 어느 단계를 돕는지 알려 준다.
 * 미션 내용은 서버에서 읽어 넣는다. 참가자가 보낸 값을 그대로 믿지 않는다.
 */
export function buildSystemPrompt(mission: Mission | null): string {
  const lines = [
    "너는 교사 대상 바이브 코딩 워크숍의 조교다. 참가자는 중고등학교 정보 교사이고, 대부분 개발 경험이 적다.",
    "답은 한국어로 한다. 3~5문장으로 짧게 답한다.",
    "굵게 표시나 제목 같은 마크다운 기호를 쓰지 않는다. 화면에 기호가 그대로 보인다.",
    "여러 개를 늘어놓을 때는 줄을 바꿔 문장으로 적는다.",
    "참가자가 스스로 정하도록 돕는다. 아이디어를 대신 골라 주지 말고 선택지와 판단 기준을 준다.",
    "모르는 것은 모른다고 한다. 이 워크숍의 일정이나 강사의 결정을 지어내지 않는다.",
    "학생 실명이나 개인정보를 다루려 하면 가상의 값으로 바꾸라고 안내한다.",
    "반나절 안에 끝낼 수 있는 크기로 줄이는 쪽을 권한다.",
  ];

  if (!mission) {
    lines.push("지금 참가자가 어느 단계에 있는지는 모른다. 필요하면 어느 단계인지 물어본다.");
    return lines.join("\n");
  }

  lines.push(
    "",
    `지금 참가자가 보고 있는 단계는 ${mission.id} "${mission.title}" (${mission.stepLabel}, ${mission.session}) 이다.`,
    TOOL_LINE[mission.tool] ?? "",
    `이 단계의 안내문: ${mission.guide}`,
  );

  if (mission.fields?.length) {
    lines.push(`이 단계에서 적어야 하는 칸: ${mission.fields.map((f) => f.label).join(", ")}`);
  }
  if (mission.promptCard) {
    lines.push(`이 단계에서 참가자가 AI에 붙여넣는 카드:\n${mission.promptCard}`);
  }
  lines.push("단계와 상관없는 질문에도 답하되, 답을 이 단계로 이어 준다.");

  return lines.filter(Boolean).join("\n");
}

/** 보낸 값이 쓸 만한지 본다. 문제가 있으면 사람이 읽을 이유를 낸다. */
export function validateTurns(input: unknown): { turns: TutorTurn[] } | { error: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: "보낼 말이 없습니다." };
  }
  const turns: TutorTurn[] = [];
  for (const raw of input) {
    const role = (raw as { role?: unknown })?.role;
    const text = (raw as { text?: unknown })?.text;
    if (role !== "user" && role !== "model") return { error: "대화 형식이 맞지 않습니다." };
    if (typeof text !== "string" || !text.trim()) return { error: "빈 말은 보낼 수 없습니다." };
    if (text.length > MAX_TURN_CHARS) {
      return { error: `한 번에 ${MAX_TURN_CHARS}자까지 보낼 수 있습니다.` };
    }
    turns.push({ role, text });
  }
  if (turns[turns.length - 1].role !== "user") {
    return { error: "대화 형식이 맞지 않습니다." };
  }
  // 앞쪽을 자른다. 지금 하는 이야기가 남아야 한다.
  return { turns: turns.slice(-MAX_TURNS) };
}

/**
 * 지난 기록에 이번 요청을 더할 수 있는지 본다.
 * 창 밖으로 나간 기록은 버린다. 세는 일은 Firestore 트랜잭션이 맡는다.
 */
export function nextHits(
  previous: unknown,
  now: number,
): { allowed: boolean; hits: number[] } {
  const kept = (Array.isArray(previous) ? previous : [])
    .filter((t): t is number => typeof t === "number" && now - t < RATE_WINDOW_MS)
    .sort((a, b) => a - b);
  if (kept.length >= RATE_LIMIT) return { allowed: false, hits: kept };
  return { allowed: true, hits: [...kept, now] };
}
