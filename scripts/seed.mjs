// 해커톤 베이스캠프 시딩 스크립트
// 실행: node scripts/seed.mjs
// roster(명단) + codes(입장 코드) + missions(m1~m8) + config/global 을 Firestore에 넣는다.
// 미션 안내문·필드·프롬프트 카드는 원고-실습콘텐츠-이승엽파트.md §B 원문을 그대로 옮겼다.

import { readFileSync } from "node:fs";
import { writeFileSync } from "node:fs";
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
const INSTRUCTOR_NAME = process.env.INSTRUCTOR_NAME || "이승엽";

const roster = [
  ...Array.from({ length: 17 }, (_, i) => ({
    name: `수강생${String(i + 1).padStart(2, "0")}`,
    school: "소속 미입력",
    role: "student",
  })),
  { name: INSTRUCTOR_NAME, school: "장평중", role: "staff" },
  ...Array.from({ length: 4 }, (_, i) => ({
    name: `강사${String(i + 1).padStart(2, "0")}`,
    school: "소속 미입력",
    role: "staff",
  })),
];

const sixDigit = () => String(Math.floor(100000 + Math.random() * 900000));

// ─────────────────────────────────────────────────────────────
// 2. 미션 8종
// ─────────────────────────────────────────────────────────────
const missions = [
  {
    id: "m1",
    order: 1,
    title: "내 수업 병목 찾기",
    stepLabel: "발견",
    session: "1일차 16시",
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
    session: "1일차 숙제",
    visibility: "public",
    guide:
      "자기 전에 한 문장이면 됩니다. 누가, 무엇 때문에 힘든데, 어떤 도구가 있으면 되는지. 내일 아침 이 문장에서 시작하니 완성도는 신경 쓰지 마세요.",
    fields: [
      { key: "oneline", label: "아이디어 한 줄", type: "textarea" },
      { key: "user", label: "이 도구의 사용자 (학생/교사/학부모)", type: "text" },
    ],
    carryover: [],
  },
  {
    id: "m3",
    order: 3,
    title: "PRD 작성",
    stepLabel: "기획",
    session: "스프린트 1",
    visibility: "name",
    guide:
      "클로드와 대화하며 아이디어를 PRD로 키우고 핵심만 아래에 정리합니다. PRD는 AI에게 시킬 말을 미리 적어 보는 문서입니다. 12시의 나에게 지킬 수 있는 약속만 적으세요.",
    fields: [
      {
        key: "problem",
        label: "문제(병목) 한 문단",
        type: "textarea",
        placeholder: "어제 m1의 병목을 문단으로",
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
    visibility: "name",
    guide:
      "PRD를 클로드에 주고 사용자 시나리오, 화면 와이어프레임, 테스트 케이스 설계를 뽑게 하세요. 테스트 케이스는 여기서 설계까지만 합니다. 코드로 옮기는 일은 m6에서 합니다.",
    promptCard: `아래 PRD로 구현 계획을 만들어줘. 형식:
1) 사용자 시나리오 — 사용자가 접속해서 나가기까지 3~5문장
2) 화면 목록과 각 화면의 텍스트 와이어프레임(ASCII 박스, 화면당 10줄 이내)
3) 테스트 케이스 설계 — 정상 2개 + 실패 3개, "~하면 ~해야 한다" 형태
아직 코드는 쓰지 마.
--- PRD ---
(붙여넣기)`,
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
    visibility: "name",
    guide:
      "클로드 새 대화를 열어 아래 카드로 계획을 검토받으세요. 같이 만든 대화의 클로드는 자기 계획에 관대해서, 맥락 없는 새 대화가 남의 눈 노릇을 합니다. 지적은 수용과 거부로 나눠 이유와 함께 기록합니다. 전부 수용했다면 그것도 검증을 포기한 셈입니다. 동료 검토도 여기서 합니다. 배정된 상대의 m3와 m4를 열람하고 체크리스트와 코멘트를 남겨 주세요.",
    promptCard: `너는 까다로운 소프트웨어 설계 리뷰어다. 아래 PRD와 구현 계획을 검토해 이 형식으로만 답하라.
1) 반나절(약 3시간)에 불가능해 보이는 지점 1가지와 축소안
2) 테스트 케이스 설계에서 빠진 실패 시나리오 2가지
3) 와이어프레임과 시나리오가 어긋나는 부분 1가지
4) 학생 개인정보·안전 위험 1가지
각 3문장 이내. 칭찬 금지.
--- PRD & 계획 ---
(붙여넣기)`,
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
      { key: "first_prompt", label: "내가 보낸 첫 지시문", type: "textarea" },
      { key: "red_count", label: "실패한 테스트 개수", type: "text" },
    ],
    carryover: [{ fromMission: "m4", fromKey: "test_design", label: "m4 테스트 케이스 설계" }],
  },
  {
    id: "m7",
    order: 7,
    title: "구현·통과 · GREEN + 배포",
    stepLabel: "구현 2차",
    session: "스프린트 2",
    visibility: "public",
    guide:
      '이번 스텝의 지시문은 하나입니다. "이 테스트를 통과시키는 최소한의 구현을 해줘." 통과했으면 배포까지 갑니다. 안 되는 부분이 있어도 괜찮으니 남은 일에 적어 두세요. 그것도 제출입니다.',
    fields: [
      { key: "green_count", label: "통과한 테스트 개수", type: "text" },
      { key: "deploy_url", label: "배포 URL", type: "url" },
      { key: "repo_url", label: "깃허브 저장소 URL", type: "url" },
      { key: "remaining", label: "남은 일 3가지 (오후 계획)", type: "textarea" },
    ],
    carryover: [],
  },
  {
    id: "m8",
    order: 8,
    title: "리팩토링 · REFACTOR + 코드 검토 + 푸시",
    stepLabel: "검토②·마감",
    session: "스프린트 2~3",
    visibility: "name",
    guide:
      "클로드 새 대화에서 코드를 검토받고, 무엇을 받아들일지 정한 뒤 다듬습니다. 마지막은 커밋과 푸시인데 이것만은 본인 손으로 하세요. 저장소에 남는 기록은 AI가 아니라 여러분의 결정이니까요. 이 미션은 오후 스프린트 3까지 열려 있습니다.",
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
      { key: "peer_feedback", label: "옆 사람 도구를 써 보고 남긴 한 줄", type: "textarea" },
    ],
    carryover: [{ fromMission: "m7", fromKey: "repo_url", label: "m7 깃허브 저장소" }],
  },
];

// ─────────────────────────────────────────────────────────────
// 3. 쓰기
// ─────────────────────────────────────────────────────────────
async function main() {
  const batch = db.batch();
  const codeRows = [["이름", "소속", "역할", "입장코드"]];

  // 이전에 시딩한 명단이 남아 있으면 지운다. 자리 데이터가 셔플에 섞이는 것을 막는다.
  const currentNames = new Set(roster.map((p) => p.name));
  const [oldRoster, oldCodes] = await Promise.all([
    db.collection("roster").get(),
    db.collection("codes").get(),
  ]);
  for (const d of oldRoster.docs) {
    if (!currentNames.has(d.id)) batch.delete(d.ref);
  }
  for (const d of oldCodes.docs) {
    if (!currentNames.has(d.id)) batch.delete(d.ref);
  }

  for (const person of roster) {
    batch.set(db.collection("roster").doc(person.name), person);

    // 이미 발급한 코드는 그대로 둔다. 다시 돌려도 인쇄한 코드가 무효가 되지 않는다.
    const codeRef = db.collection("codes").doc(person.name);
    const existing = oldCodes.docs.find((d) => d.id === person.name);
    const code = existing?.data()?.code ?? sixDigit();
    if (!existing) batch.set(codeRef, { code });
    codeRows.push([person.name, person.school, person.role, code]);
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

  const csv = codeRows.map((r) => r.join(",")).join("\n");
  const csvPath = new URL("./codes-출력.csv", import.meta.url);
  writeFileSync(csvPath, "﻿" + csv, "utf8");

  console.log(`명단 ${roster.length}명, 미션 ${missions.length}종을 넣었습니다.`);
  console.log(`입장 코드 배부용 파일: scripts/codes-출력.csv`);
  console.log(csv);
}

main().catch((e) => {
  console.error("시딩에 실패했습니다:", e.message);
  process.exit(1);
});
