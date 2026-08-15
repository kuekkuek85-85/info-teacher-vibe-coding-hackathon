export type FieldType = "text" | "textarea" | "url" | "select" | "checklist";

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
  guide: string;
  promptCard?: string;
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
