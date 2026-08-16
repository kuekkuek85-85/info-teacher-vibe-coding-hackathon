// 강사가 참가자 화면에 띄우는 자료를 확인한다.
// 실행: node scripts/check-slides.ts
import { existsSync, readFileSync } from "node:fs";
import { DECKS, clampIndex, findDeck, slideSrc } from "../lib/decks.ts";

let failures = 0;
const check = (label: string, ok: boolean, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "통과" : "실패"} — ${label} ${extra}`);
};

// 1. 자료 목록
check("자료가 하나 이상 있다", DECKS.length > 0);
const m0 = findDeck("m0");
check("m0 자료가 있다", Boolean(m0));
check("m0 제목", m0?.title === "바이브 코딩의 필요성", m0?.title);
check("없는 자료는 null", findDeck("없음") === null);
check("빈 값도 null", findDeck("") === null && findDeck(undefined) === null);

// 2. 이미지 파일이 실제로 있어야 한다. 없으면 참가자 화면이 빈 채로 덮인다.
for (const deck of DECKS) {
  check(`${deck.id} 장수가 1 이상`, deck.count >= 1, `${deck.count}`);
  let missing = 0;
  for (let i = 0; i < deck.count; i++) {
    const path = new URL(`../public${slideSrc(deck, i)}`, import.meta.url);
    if (!existsSync(path)) missing++;
  }
  check(`${deck.id} 이미지 ${deck.count}장이 모두 있다`, missing === 0, `빠짐 ${missing}장`);
  // 장수보다 파일이 많으면 마지막 장이 잘려 안 보인다
  const extra = new URL(`../public/slides/${deck.id}/slide-${deck.count + 1}.jpg`, import.meta.url);
  check(`${deck.id} 에 남는 이미지가 없다`, !existsSync(extra));
}

// 3. 경로
check("경로 형식", slideSrc(DECKS[0], 0) === `/slides/${DECKS[0].id}/slide-1.jpg`);
check("두 번째 장은 slide-2", slideSrc(DECKS[0], 1).endsWith("slide-2.jpg"));

// 4. 범위 밖으로 넘어가지 않는다
const deck = DECKS[0];
check("앞으로 더 눌러도 첫 장", clampIndex(deck, -5) === 0);
check("뒤로 더 눌러도 마지막 장", clampIndex(deck, 999) === deck.count - 1);
check("소수는 첫 장으로", clampIndex(deck, 1.5) === 0);
check("숫자가 아니면 첫 장으로", clampIndex(deck, NaN) === 0);
check("가운데 값은 그대로", clampIndex(deck, 2) === 2);

// 5. 서버와 화면이 지켜야 할 것
const api = readFileSync(new URL("../app/api/admin/route.ts", import.meta.url), "utf8");
check("띄우기는 PIN 라우트를 거친다", api.includes('case "showSlides"'));
check("끄기도 PIN 라우트를 거친다", api.includes('case "hideSlides"'));
check("모르는 자료는 거부한다", /findDeck\(String\(body\.deck[^)]*\)\);\s*if \(!deck\)/.test(api));
check("서버에서도 범위를 자른다", api.includes("clampIndex(deck, Number(body.index"));

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
check("어느 화면에서나 덮인다", layout.includes("<SlideOverlay />"));

const overlay = readFileSync(new URL("../components/SlideOverlay.tsx", import.meta.url), "utf8");
check("참가자 화면을 덮는다", overlay.includes('aria-modal="true"'));
check("강사 화면은 덮지 않는다", overlay.includes('pathname?.startsWith("/teacher")'));
check("덮는 동안 스크롤을 막는다", overlay.includes('document.body.style.overflow = "hidden"'));
check("다음 장을 미리 받는다", overlay.includes('rel="preload"'));
// 가리기만 하면 Tab 으로 아래 버튼에 닿는다
check("아래 화면을 통째로 잠근다", overlay.includes('setAttribute("inert", "")'));
check("잠금을 풀어 준다", overlay.includes('removeAttribute("inert")'));
check("포커스를 데려온다", overlay.includes("panelRef.current?.focus()"));
// inert 는 document 에 붙은 키 핸들러를 막지 못한다
check("키 입력을 먼저 가로챈다", overlay.includes('addEventListener("keydown", swallow, true)'));
check("가로챈 것을 아래로 넘기지 않는다", overlay.includes("e.stopPropagation()"));
check("끄면 가로채기를 뗀다", overlay.includes('removeEventListener("keydown", swallow, true)'));
check("끄면 포커스를 돌려준다", overlay.includes("wasFocused?.focus?.()"));
check("잠글 대상이 레이아웃에 있다", layout.includes('id="app-root"'));

const teacher = readFileSync(new URL("../app/teacher/page.tsx", import.meta.url), "utf8");
check(
  "넘기는 키가 화면을 스크롤하지 않는다",
  (teacher.match(/e\.preventDefault\(\);/g) ?? []).length >= 3,
);


const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
check(
  "참가자는 자료 상태를 못 바꾼다",
  /match \/config\/\{doc\}\s*\{ allow read: if request\.auth != null; allow write: if false; \}/.test(
    rules,
  ),
);

// 6. 리허설에서 띄운 채로 끝내면 다음 사람 화면이 막힌다
const reset = readFileSync(new URL("./reset-progress.mjs", import.meta.url), "utf8");
check(
  "초기화가 띄운 자료를 내린다",
  /doc\("slides"\), \{ deck: "", index: 0 \}/.test(reset),
);

console.log(failures === 0 ? "\n전부 통과했습니다." : `\n${failures}건 실패했습니다.`);
process.exit(failures === 0 ? 0 : 1);
