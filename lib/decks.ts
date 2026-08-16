export interface Deck {
  /** 어느 자리에서 쓰는 자료인지. m0 은 m1 을 열기 전이다 */
  id: string;
  title: string;
  /** 슬라이드 장수. 파일은 /slides/{id}/slide-1.jpg 부터 순서대로 둔다 */
  count: number;
}

/**
 * 강사가 띄울 수 있는 자료. 파일은 public/slides 아래에 있다.
 * 새 자료를 넣으려면 이미지를 두고 여기에 한 줄 더한다.
 */
export const DECKS: Deck[] = [
  { id: "m0", title: "바이브 코딩의 필요성", count: 6 },
  { id: "m1", title: "애자일과 MVP", count: 2 },
  { id: "m2", title: "바이브 코딩 목적과 타겟 유저", count: 1 },
  { id: "m3", title: "PRD", count: 1 },
  { id: "m4", title: "구현 계획", count: 2 },
  { id: "m5", title: "오케스트레이션", count: 1 },
  { id: "m6", title: "TDD", count: 1 },
  { id: "m7", title: "Git", count: 1 },
  { id: "m8", title: "리팩토링", count: 1 },
  { id: "m9", title: "공유 및 발표(README)", count: 1 },
];

export function findDeck(id: string | undefined | null): Deck | null {
  return DECKS.find((d) => d.id === id) ?? null;
}

/** 참가자 화면에 지금 무엇을 띄울지 */
export interface SlideState {
  /** 띄우는 중인 자료. 닫혀 있으면 빈 값 */
  deck: string;
  /** 0 부터 센다 */
  index: number;
}

export function slideSrc(deck: Deck, index: number): string {
  return `/slides/${deck.id}/slide-${index + 1}.jpg`;
}

/** 범위를 벗어나지 않게 자른다. 강사가 끝에서 더 눌러도 넘어가지 않는다 */
export function clampIndex(deck: Deck, index: number): number {
  if (!Number.isInteger(index)) return 0;
  return Math.min(Math.max(index, 0), deck.count - 1);
}
