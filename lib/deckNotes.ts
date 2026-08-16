import { clampIndex, type Deck } from "./decks.ts";
// 확장자를 붙여야 검사 스크립트가 이 파일을 그대로 실행할 수 있다
import m0Notes from "./notes/m0.ts";
import m2Notes from "./notes/m2.ts";
import m3Notes from "./notes/m3.ts";
import m4Notes from "./notes/m4.ts";
import m5Notes from "./notes/m5.ts";

/**
 * 강사가 보고 읽는 대본. 원본 pptx 의 슬라이드 노트를 그대로 옮겼다.
 *
 * decks.ts 와 나눠 둔 이유가 있다. decks.ts 는 참가자 화면을 덮는
 * SlideOverlay 가 쓰고, 그 컴포넌트는 layout 에 있어 모든 참가자에게 내려간다.
 * 한 파일에 두면 대본까지 함께 실려 간다. 이 파일은 강사 화면에서만 가져온다.
 */
const NOTES: Record<string, string[]> = {
  m0: m0Notes,
  m2: m2Notes,
  m3: m3Notes,
  m4: m4Notes,
  m5: m5Notes,
};

export function deckNote(deck: Deck, index: number): string {
  return NOTES[deck.id]?.[clampIndex(deck, index)] ?? "";
}
