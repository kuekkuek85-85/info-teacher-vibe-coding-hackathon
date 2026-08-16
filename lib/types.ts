export type FieldType =
  | "text"
  | "textarea"
  | "url"
  | "select"
  | "checklist"
  /** 항목마다 체크와 한 줄 설명을 함께 받는다 */
  | "roles";

/**
 * 이 단계를 무엇으로 하는지.
 * human 은 사람이 직접 적는 칸, chat 은 대화형 AI, agent 는 코딩 에이전트다.
 */
export type MissionTool = "human" | "chat" | "agent";

export interface MissionField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
}

export interface Carryover {
  fromMission: string;
  fromKey: string;
  label: string;
}

export interface Mission {
  id: string;
  title: string;
  stepLabel: string;
  order: number;
  session: string;
  tool: MissionTool;
  guide: string;
  promptCard?: string;
  /** 카드를 붙여넣을 곳이 이 단계의 진행 방식과 다를 때 쓴다 */
  promptTool?: MissionTool;
  /** 색 블록 아래 한 줄. 기본 문장이 이 단계와 안 맞을 때만 적는다 */
  toolLine?: string;
  /** 프롬프트 카드의 자리표시자에 채울 내 제출물 */
  promptFill?: {
    slot: string;
    sources: { mission: string; keys: string[]; label?: string }[];
  };
  prefill?: { template: string };
  fields: MissionField[];
  carryover: Carryover[];
  open: boolean;
  visibility: "private" | "name" | "public";
}

export interface MissionEntry {
  status: "draft" | "submitted";
  updatedAt?: unknown;
  data: Record<string, string>;
}

export interface Progress {
  ownerUid: string | null;
  name: string;
  school: string;
  role: "student" | "staff";
  missions: Record<string, MissionEntry>;
  currentStep: string;
  stuck: boolean;
  stuckAt?: unknown;
  reviewTarget?: string;
  /** 발표용 README. 초안을 고친 내용을 여기에 둔다 */
  readmeDraft?: string;
  /** 저장소에 README 를 올렸는지. 발표 준비 상태를 본다 */
  readmePushed?: boolean;
  /** README 를 올렸다고 표시한 시각. 발표 순서를 이 순서로 잡는다 */
  readmePushedAt?: unknown;
}

export interface RosterEntry {
  name: string;
  school: string;
  role: "student" | "staff";
}

export interface Review {
  reviewer: string;
  target: string;
  checklist: Record<string, boolean>;
  comment: string;
  createdAt?: unknown;
}

/** 원고 §B-5 동료 검토 체크리스트 (원문 그대로) */
export const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "mvp_one_sentence", label: "MVP가 한 문장으로 읽히는가" },
  { key: "morning_only", label: "오후 없이 오전만으로 가능해 보이는가" },
  { key: "concrete_failure", label: "실패 케이스가 구체적인가 (\"학생이 ~하면\")" },
  { key: "wireframe_imaginable", label: "와이어프레임만 보고 화면이 상상되는가" },
  { key: "want_to_use", label: "내 수업에도 쓰고 싶은가" },
];
