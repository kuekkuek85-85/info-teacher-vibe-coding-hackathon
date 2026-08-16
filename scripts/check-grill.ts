// 아이디어를 캐묻는 자리를 확인한다. Gemini 를 부르지 않는다.
// 실행: node scripts/check-grill.ts
import { readFileSync } from "node:fs";
import {
  MAX_IDEA_CHARS,
  buildGrillInput,
  buildGrillPrompt,
  validateGrillInput,
} from "../lib/grill.ts";

let failures = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

// 1. 사람 됨됨이
const prompt = buildGrillPrompt();
check("교육용 바이브 코딩 전문가로 선다", prompt.includes("교육용 바이브 코딩 웹 앱"));
check("워크숍 맥락을 안다", prompt.includes("정보 교사") && prompt.includes("반나절"));
check("질문 수를 못 박는다", prompt.includes("질문 5개만"));
check("답을 대신 정하지 않는다", prompt.includes("답을 대신 정해 주지 않는다"));
check("칭찬하지 않는다", prompt.includes("칭찬하지 않는다"));
check("한국어로 쓴다", prompt.includes("한국어로 쓴다"));
check("마크다운으로 답한다", prompt.includes("형식은 마크다운이다"));
check(
  "다섯 자리를 하나씩 맡긴다",
  ["진짜 병목", "누구의 문제", "이미 있는 도구", "반나절", "개인정보"].every((k) =>
    prompt.includes(k),
  ),
);
check("한 줄 요약을 시킨다", prompt.includes("한 줄로 줄이면"));

// 2. 캐물 감
const both = buildGrillInput("형성평가를 그 시간 안에 돌려주고 싶다", "[v] 학생: 사진으로 올린다");
check("아이디어가 들어간다", both.includes("형성평가를 그 시간 안에"));
check("사용자와 역할이 들어간다", both.includes("[v] 학생: 사진으로 올린다"));
check("제목이 붙는다", both.includes("## 아이디어 한 줄"));

const onlyIdea = buildGrillInput("아이디어만 있다", "   ");
check("역할이 비면 그 제목을 안 만든다", !onlyIdea.includes("사용자와 그 사람이"));
check(
  "아이디어가 비면 그렇게 적는다",
  buildGrillInput("", "").includes("(아직 적지 않았습니다)"),
);

// 3. 보낸 값 검사
check("정상 아이디어는 통과", "idea" in validateGrillInput("병목이 있다", "학생: 올린다"));
check("역할이 없어도 통과", "idea" in validateGrillInput("병목이 있다", undefined));
check("빈 아이디어는 거부", "error" in validateGrillInput("   ", ""));
check("문자열이 아니면 거부", "error" in validateGrillInput(42, ""));
check("없으면 거부", "error" in validateGrillInput(undefined, ""));
check("역할이 문자열이 아니면 거부", "error" in validateGrillInput("병목", 42));
check(
  "합쳐서 길면 거부",
  "error" in validateGrillInput("가".repeat(MAX_IDEA_CHARS), "나".repeat(2)),
);
check(
  "합쳐서 한도 안이면 통과",
  "idea" in validateGrillInput("가".repeat(MAX_IDEA_CHARS - 2), "나".repeat(2)),
);
check(
  "말없이 자르지 않는다",
  !readFileSync(new URL("../app/api/grill/route.ts", import.meta.url), "utf8").includes(
    ".slice(0, 1500)",
  ),
);

// 4. 서버 라우트가 지켜야 할 것
const route = readFileSync(new URL("../app/api/grill/route.ts", import.meta.url), "utf8");
check("입장 토큰을 검증한다", route.includes("checkParticipant"));
check("몰아 보내기를 막는다", route.includes("checkRate"));
check("시간을 끊는다", route.includes("TOTAL_TIMEOUT_MS"));
check("키가 없으면 안내만 낸다", route.includes("GEMINI_API_KEY"));
check("모델 사슬을 함께 쓴다", route.includes("askGemini"));

// 튜터와 캐묻기가 같은 장치를 쓴다. 한쪽만 고치는 일이 없게 한 곳에 둔다.
const tutor = readFileSync(new URL("../app/api/tutor/route.ts", import.meta.url), "utf8");
check("튜터도 같은 장치를 쓴다", tutor.includes('from "@/lib/gemini"'));
check("튜터에 모델 사슬이 남아 있지 않다", !tutor.includes("generativelanguage"));

// 5. 화면
const panel = readFileSync(new URL("../components/GrillPanel.tsx", import.meta.url), "utf8");
check("버튼 이름이 뾰족하게다", panel.includes('"뾰족하게"'));
check("마크다운으로 그린다", panel.includes("ReactMarkdown"));
check("토큰을 실어 보낸다", panel.includes("Bearer ${idToken}"));
check("답을 저장하지 않는다", !panel.includes("saveMission") && !panel.includes("setDoc"));
// 기다리는 동안 고치면 답이 무엇을 본 것인지 흐려진다
check("물을 때의 문장을 붙들어 둔다", panel.includes("setAsked({ idea, roles })"));
check("바뀌었으면 그렇게 말한다", panel.includes("바뀌기 전 문장을 보고 나온 것입니다"));
check("새로 물으면 앞 답을 지운다", panel.includes("setReply(null);\n    setAsked"));

const detail = readFileSync(
  new URL("../components/MissionDetail.tsx", import.meta.url),
  "utf8",
);
check("m2 에서만 띄운다", /mission\.id === "m2" \? \(\s*<GrillPanel/.test(detail));
check(
  "지금 적고 있는 값을 넘긴다",
  detail.includes("liveData(progress, mission.id, draft)"),
);

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
