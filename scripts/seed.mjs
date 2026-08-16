// 해커톤 베이스캠프 시딩 스크립트
// 실행: node scripts/seed.mjs
// roster(명단) + codes(입장 코드) + missions(m1~m10) + config/global 을 Firestore에 넣는다.
// m1~m8 의 안내문·필드·프롬프트 카드는 원고-실습콘텐츠-이승엽파트.md §B 원문을 그대로 옮겼다.
// m9 발표·m10 회고는 원고 밖에서 추가한 것이라 대조할 원문이 없다.

import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// .env.local 읽기 (dotenv 없이 최소 파서)
try {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // .env.local 이 없으면 셸 환경 변수를 쓴다
}

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\\n/g, "\n"),
    }),
  });
const db = getFirestore(app);

// ─────────────────────────────────────────────────────────────
// 1. 명단 — 실명단 확보 전 자리 데이터
//    교체 방법: 아래 배열의 name·school 을 실제 값으로 바꾸고 다시 실행한다.
//    동명이인이 있으면 name 을 "이름(소속)" 형식으로 적는다.
// ─────────────────────────────────────────────────────────────
const roster = [
  ...Array.from({ length: 17 }, (_, i) => ({
    name: `수강생${String(i + 1).padStart(2, "0")}`,
    school: "소속 미입력",
    role: "student",
  })),
  { name: "이승엽", school: "장평중", role: "staff" },
  ...Array.from({ length: 4 }, (_, i) => ({
    name: `강사${String(i + 1).padStart(2, "0")}`,
    school: "소속 미입력",
    role: "staff",
  })),
];

// ─────────────────────────────────────────────────────────────
// 1-2. 예비 검토자 겸 테스트 계정
//    학생이 홀수라 짝이 없는 한 명이 생기면 이 계정이 그 사람을 검토한다.
//    role 이 staff 라서 짝짓기 대상에 들어가지 않는다. 진행률 집계에서도 빠진다.
//    화면 확인용으로 미션을 직접 밟아 볼 수도 있다.
//    .env 의 FALLBACK_REVIEWER_NAME 과 이름이 같아야 한다.
// ─────────────────────────────────────────────────────────────
const extraAccounts = [{ name: "홍길동", school: "예비 검토자", role: "staff" }];

roster.push(...extraAccounts);

// 입장 코드는 워크숍 전체가 하나를 함께 쓴다. .env 의 WORKSHOP_CODE 다.
// 개인별 코드를 쓰던 흔적(codes 컬렉션)은 시딩할 때 지운다.

// ─────────────────────────────────────────────────────────────
// 2. 미션 10종. tool 이 진행 방식을 가른다.
//    human 은 사람이 직접(m1·m2·m10), chat 은 대화형 AI(m3~m5), agent 는 클로드 코드(m6~m9).
// ─────────────────────────────────────────────────────────────
const missions = [
  {
    id: "m1",
    order: 1,
    title: "내 수업 병목 찾기",
    stepLabel: "발견",
    session: "2일차 아침",
    tool: "human",
    visibility: "private",
    guide:
      "잘하고 싶은 것 말고 아픈 것을 적습니다. 매주 반복되는 일, 학생을 기다리게 하는 순간, 아직 손으로 하는 작업이면 전부 병목입니다. 국면마다 하나 이상 적어 주세요.",
    fields: [
      {
        key: "prep",
        label: "수업 준비에서 반복되는 일",
        type: "textarea",
        placeholder: "예: 차시마다 활동 링크를 칠판에 적고 QR 새로 만들기",
      },
      {
        key: "during",
        label: "수업 중 학생이 기다리는 순간",
        type: "textarea",
        placeholder: "예: 실습 결과물을 한 명씩 확인하는 동안 나머지가 대기",
      },
      {
        key: "assess",
        label: "평가·채점에서 손으로 하는 일",
        type: "textarea",
        placeholder: "예: 엔트리 작품 30개를 하나씩 열어 실행하며 채점",
      },
      {
        key: "feedback",
        label: "피드백이 늦어지는 지점",
        type: "textarea",
        placeholder: "예: 형성평가 결과를 다음 주에야 돌려줌",
      },
    ],
    carryover: [],
  },
  {
    id: "m2",
    order: 2,
    title: "아이디어 한 줄",
    stepLabel: "발견",
    session: "2일차 아침",
    tool: "human",
    visibility: "public",
    guide:
      "한 문장이면 됩니다. 누가, 무엇 때문에 힘든데, 어떤 도구가 있으면 되는지 적어 주세요. 바로 다음 단계에서 이 문장을 PRD로 키우니 완성도는 신경 쓰지 마세요.",
    fields: [
      { key: "oneline", label: "아이디어 한 줄", type: "textarea" },
      {
        key: "user",
        label: "이 도구의 사용자와 그 사람이 하는 일",
        type: "roles",
        options: ["학생", "교사", "학부모"],
        placeholder: "이 사람이 무엇을 하는지 한 줄로",
      },
    ],
    carryover: [],
  },
  {
    id: "m3",
    order: 3,
    title: "PRD 작성",
    stepLabel: "기획",
    session: "스프린트 1",
    tool: "chat",
    visibility: "name",
    guide:
      "클로드와 대화하며 아이디어를 PRD로 키우고 핵심만 아래에 정리합니다. PRD는 AI에게 시킬 말을 미리 적어 보는 문서입니다. 12시의 나에게 지킬 수 있는 약속만 적으세요.",
    fields: [
      {
        key: "problem",
        label: "문제(병목) 한 문단",
        type: "textarea",
        placeholder: "m1 에 적은 병목을 문단으로",
      },
      {
        key: "mvp",
        label: "MVP — 12시까지 반드시 동작할 한 가지",
        type: "textarea",
        placeholder: '"~가 되면 성공" 한 문장 + 기능 최대 3개',
      },
      {
        key: "context",
        label: "CONTEXT — AI에게 줄 맥락",
        type: "textarea",
        placeholder: "대상 학년, 기존 도구, 스택 제약",
      },
      {
        key: "p1",
        label: "P1 — 오늘은 안 만들 것",
        type: "textarea",
        placeholder: "여기 적어야 오늘 범위가 지켜집니다",
      },
      {
        key: "stack",
        label: "스택·배포",
        type: "text",
        placeholder: "예: Next.js+Firebase+Vercel / HTML 단일 파일+Netlify",
      },
    ],
    carryover: [{ fromMission: "m2", fromKey: "oneline", label: "m2 아이디어 한 줄" }],
  },
  {
    id: "m4",
    order: 4,
    title: "구현 계획",
    stepLabel: "기획",
    session: "스프린트 1",
    tool: "chat",
    visibility: "name",
    guide:
      "PRD를 클로드에 주고 사용자 시나리오, 화면 와이어프레임, 테스트 케이스 설계를 뽑게 하세요. 테스트 케이스는 여기서 설계까지만 합니다. 코드로 옮기는 일은 m6에서 합니다.",
    promptCard: `아래 PRD로 구현 계획을 만들어줘. 형식:
1) 사용자 시나리오 — 사용자가 접속해서 나가기까지 3~5문장
2) 화면 목록과 각 화면의 텍스트 와이어프레임(ASCII 박스, 화면당 10줄 이내)
3) 테스트 케이스 설계 — "~하면 ~해야 한다" 형태로 5개
   정상 2개: 사용자가 제대로 썼을 때 무엇이 나와야 하는가
   예) "답안 20개를 붙여넣으면 정답 개수를 보여줘야 한다"
   실패 3개: 잘못 쓰거나 예상 밖의 값이 들어와도 무너지지 않는가
   비어 있을 때, 형식이 어긋날 때, 너무 많거나 적을 때처럼 이 도구에서 실제로 벌어질 실패 상황을 골라라
   예) "답안 없이 채점을 누르면 답안을 먼저 넣으라고 알려줘야 한다"
아직 코드는 쓰지 마.
--- PRD ---
(붙여넣기)`,
    promptFill: {
      slot: "(붙여넣기)",
      sources: [
        { mission: "m3", label: "PRD", keys: ["problem", "mvp", "context", "p1", "stack"] },
      ],
    },
    fields: [
      { key: "scenario", label: "사용자 시나리오", type: "textarea" },
      { key: "wireframe", label: "화면 목록 + 텍스트 와이어프레임", type: "textarea" },
      { key: "test_design", label: "테스트 케이스 설계 (정상 2 + 실패 3)", type: "textarea" },
    ],
    carryover: [{ fromMission: "m3", fromKey: "mvp", label: "m3 MVP" }],
  },
  {
    id: "m5",
    order: 5,
    title: "계획 검토 게이트",
    stepLabel: "검토①",
    session: "스프린트 1",
    tool: "chat",
    visibility: "name",
    guide:
      "클로드(혹은 Chat GPT 등) 새 대화를 열어 아래 카드로 계획을 검토받으세요. 같이 만든 대화의 클로드는 자기 계획에 관대해서, 맥락 없는 새 대화가 남의 눈 노릇을 합니다. 지적은 수용과 거부로 나눠 이유와 함께 기록합니다. 전부 수용했다면 그것도 검증을 포기한 셈입니다. 동료 검토도 여기서 합니다. 배정된 상대의 m3와 m4를 열람하고 체크리스트와 코멘트를 남겨 주세요.",
    promptCard: `너는 까다로운 소프트웨어 설계 리뷰어다. 아래 PRD와 구현 계획을 검토해 이 형식으로만 답하라.
1) 반나절(약 3시간)에 불가능해 보이는 지점 1가지와 축소안
2) 테스트 케이스 설계에서 빠진 실패 시나리오 2가지
3) 와이어프레임과 시나리오가 어긋나는 부분 1가지
4) 학생 개인정보·안전 위험 1가지
각 3문장 이내. 칭찬 금지.
--- PRD & 계획 ---
(붙여넣기)`,
    promptFill: {
      slot: "(붙여넣기)",
      sources: [
        { mission: "m3", label: "PRD", keys: ["problem", "mvp", "context", "p1", "stack"] },
        {
          mission: "m4",
          label: "구현 계획",
          keys: ["scenario", "wireframe", "test_design"],
        },
      ],
    },
    fields: [
      { key: "accepted", label: "수용해 계획에 반영한 것", type: "textarea" },
      { key: "rejected", label: "거부한 지적과 그 이유", type: "textarea" },
    ],
    carryover: [
      { fromMission: "m4", fromKey: "scenario", label: "m4 사용자 시나리오" },
      { fromMission: "m4", fromKey: "wireframe", label: "m4 화면 와이어프레임" },
      { fromMission: "m4", fromKey: "test_design", label: "m4 테스트 케이스 설계" },
    ],
  },
  {
    id: "m6",
    order: 6,
    title: "테스트 코드 작성 · RED",
    stepLabel: "구현 1차",
    session: "스프린트 2",
    tool: "agent",
    visibility: "name",
    guide:
      "구현 전에 채점 기준부터 만듭니다. 테스트 케이스 설계를 실패하는 테스트 코드로 옮기고, 빨갛게 실패하는 화면까지 확인해야 이 미션이 끝납니다.",
    prefill: {
      template: `(스택) 기반 '(도구 이름)' 프로젝트를 시작할 거야.
먼저 아래 테스트 케이스 설계를 실패하는 테스트 코드로만 작성해줘.
구현 코드는 아직 쓰지 마. 테스트 러너 설정까지만.
그리고 커밋과 푸시는 내가 직접 할 테니 너는 하지 마.
--- 테스트 케이스 설계 ---
(m4에서 자동 표시)`,
      targetKey: "first_prompt",
      slot: "(m4에서 자동 표시)",
      fromMission: "m4",
      fromKey: "test_design",
    },
    fields: [
      {
        key: "first_prompt",
        label: "내가 보낸 첫 지시문",
        type: "textarea",
        placeholder:
          "예) Next.js 기반 '형성평가 채점 도우미' 프로젝트를 시작할 거야. 아래 테스트 케이스 설계를 실패하는 테스트 코드로만 작성해줘. 구현 코드는 아직 쓰지 마. 테스트 러너 설정까지만. 커밋과 푸시는 내가 직접 할 테니 너는 하지 마.",
      },
      { key: "red_count", label: "실패한 테스트 개수", type: "text", placeholder: "예) 5" },
    ],
    carryover: [{ fromMission: "m4", fromKey: "test_design", label: "m4 테스트 케이스 설계" }],
  },
  {
    id: "m7",
    order: 7,
    title: "구현·통과 · GREEN + 배포",
    stepLabel: "구현 2차",
    session: "스프린트 2",
    tool: "agent",
    visibility: "public",
    guide:
      '이번 스텝의 지시문은 하나입니다. "이 테스트를 통과시키는 최소한의 구현을 해줘." 통과했으면 Github 커밋, 푸시까지 가고, 배포까지 갑니다. 안 되는 부분이 있어도 괜찮으니 남은 일에 적어 두세요. 그것도 제출입니다.',
    fields: [
      { key: "green_count", label: "통과한 테스트 개수", type: "text" },
      { key: "deploy_url", label: "배포 URL", type: "url" },
      { key: "repo_url", label: "깃허브 저장소 URL", type: "url" },
      {
        key: "remaining",
        label: "남은 일 (추후 계획)",
        type: "textarea",
        placeholder: "예) 로그인은 아직 없습니다. 채점 결과를 저장하지 못합니다.",
      },
    ],
    carryover: [],
  },
  {
    id: "m8",
    order: 8,
    title: "리팩토링 · REFACTOR + 코드 검토 + 푸시",
    stepLabel: "검토②·마감",
    session: "스프린트 2~3",
    tool: "agent",
    visibility: "name",
    guide:
      "코드의 리팩토링을 검토받고, 무엇을 받아들일지 정한 뒤 다듬습니다. 마지막은 커밋과 푸시인데 이것만은 본인 손으로 하세요. 저장소에 남는 기록은 AI가 아니라 여러분의 결정이니까요.",
    promptCard: `너는 까다로운 코드 리뷰어다. 아래 핵심 파일들을 검토해 이 형식으로만 답하라.
1) 지금 고치지 않으면 나중에 아플 곳 2가지
2) 테스트가 놓치고 있는 구멍 1가지
3) 이름·구조가 의도를 못 담은 곳 1가지
각 3문장 이내. 새 기능 제안 금지, 다듬기만.
--- 코드 ---
(핵심 파일 붙여넣기)`,
    fields: [
      { key: "accepted", label: "수용해 리팩토링한 것", type: "textarea" },
      { key: "rejected", label: "거부한 지적과 이유", type: "textarea" },
      { key: "commit_msg", label: "내가 쓴 커밋 메시지", type: "text" },
      { key: "pushed", label: "푸시 완료 (예/아니오)", type: "select", options: ["예", "아니오"] },
      { key: "peer_feedback", label: "내 동료의 도구를 써 보고 남긴 한 줄", type: "textarea" },
    ],
    carryover: [{ fromMission: "m7", fromKey: "repo_url", label: "m7 깃허브 저장소" }],
  },
  {
    id: "m9",
    order: 9,
    title: "발표 · README로 5분",
    stepLabel: "발표",
    session: "2일차 오후",
    tool: "agent",
    visibility: "public",
    guide:
      "발표 자료를 따로 만들지 않습니다. 저장소의 README 하나로 5분 동안 말하고, 중간에 도구를 켜서 보여 줍니다. 아래 버튼으로 초안을 열면 지금까지 적은 것이 이미 들어가 있습니다. 고쳐서 저장소에 올린 다음 올렸다고 표시해 주세요.",
    fields: [
      {
        key: "readme_url",
        label: "README 주소",
        type: "url",
        placeholder: "예) https://github.com/이름/저장소#readme",
      },
      {
        key: "demo_plan",
        label: "5분 동안 보여 줄 순서",
        type: "textarea",
        placeholder: "예) 문제 1분, 시연 2분, 안 된 것 1분, 다음 계획 1분",
      },
      {
        key: "demo_data",
        label: "시연에 쓸 예시 데이터",
        type: "textarea",
        placeholder: "학생 실명은 넣지 마세요. 가상의 값으로 준비하세요",
      },
    ],
    carryover: [{ fromMission: "m7", fromKey: "deploy_url", label: "m7 배포 주소" }],
  },
  {
    id: "m10",
    order: 10,
    title: "회고",
    stepLabel: "회고",
    session: "2일차 오후",
    tool: "human",
    visibility: "name",
    guide:
      "마지막 칸입니다. 잘된 것보다 막혔던 자리가 다음 수업에 쓸모가 큽니다. 네 칸 모두 두세 문장이면 충분합니다.",
    fields: [
      {
        key: "about_hackathon",
        label: "해커톤에 대해",
        type: "textarea",
        placeholder: "이틀의 흐름에서 도움이 된 것과 빠졌으면 하는 것",
      },
      {
        key: "about_output",
        label: "내 산출물에 대해",
        type: "textarea",
        placeholder: "만든 것 중 쓸 만한 것과 다시 만든다면 바꿀 것",
      },
      {
        key: "about_subject",
        label: "정보 교과에 대해",
        type: "textarea",
        placeholder: "이 방식을 수업 어디에 넣을 수 있는지",
      },
      {
        key: "overall",
        label: "전반적인 성찰",
        type: "textarea",
        placeholder: "동료에게 한 줄로 남긴다면",
      },
    ],
    carryover: [],
  },
];

// ─────────────────────────────────────────────────────────────
// 3. 쓰기
// ─────────────────────────────────────────────────────────────
async function main() {
  const batch = db.batch();

  // 이전에 시딩한 명단이 남아 있으면 지운다. 자리 데이터가 셔플에 섞이거나
  // 광장에 유령 참가자로 나타나는 것을 막는다.
  const currentNames = new Set(roster.map((p) => p.name));
  const [oldRoster, oldCodes, oldProgress, oldReviews] = await Promise.all([
    db.collection("roster").get(),
    db.collection("codes").get(),
    db.collection("progress").get(),
    db.collection("reviews").get(),
  ]);

  let removed = 0;
  for (const d of oldRoster.docs) {
    if (!currentNames.has(d.id)) {
      batch.delete(d.ref);
      removed++;
    }
  }
  // 개인별 코드는 더 쓰지 않는다. 남아 있으면 전부 지운다.
  for (const d of oldCodes.docs) batch.delete(d.ref);
  for (const d of oldProgress.docs) {
    if (!currentNames.has(d.id)) batch.delete(d.ref);
  }
  for (const d of oldReviews.docs) {
    const v = d.data();
    if (!currentNames.has(v.reviewer) || !currentNames.has(v.target)) batch.delete(d.ref);
  }

  for (const person of roster) {
    batch.set(db.collection("roster").doc(person.name), person);
  }

  for (const mission of missions) {
    const { id, ...rest } = mission;
    // open 은 항상 false 로 시작한다. 당일 운영자가 연다.
    // 이미 열린 미션을 다시 닫지 않도록 merge 로 쓰되 open 은 기존 값을 남긴다.
    const ref = db.collection("missions").doc(id);
    const snap = await ref.get();
    batch.set(ref, { ...rest, open: snap.exists ? snap.data().open === true : false }, { merge: true });
  }

  // presentOrder 는 이미 정해 두었으면 건드리지 않는다.
  const configRef = db.collection("config").doc("global");
  if (!(await configRef.get()).exists) {
    batch.set(configRef, { presentOrder: [] });
  }

  await batch.commit();

  console.log(`명단 ${roster.length}명, 미션 ${missions.length}종을 넣었습니다.`);
  if (removed > 0) {
    console.log(`명단에서 빠진 ${removed}명의 기록도 함께 지웠습니다.`);
  }
  if (oldCodes.size > 0) {
    console.log(`더 쓰지 않는 개인별 코드 ${oldCodes.size}건을 지웠습니다.`);
  }
  console.log(
    `수업 코드는 .env 의 WORKSHOP_CODE 하나입니다: ${process.env.WORKSHOP_CODE || "(설정 안 됨)"}`,
  );

  if (extraAccounts.length > 0) {
    const names = extraAccounts.map((t) => t.name).join(", ");
    console.log(`\n예비 검토자 계정: ${names}`);
    console.log("학생이 홀수일 때 짝 없는 한 명을 검토합니다.");
  }
}

main().catch((e) => {
  console.error("시딩에 실패했습니다:", e.message);
  process.exit(1);
});
