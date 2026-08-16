"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { ensureAnonAuth, getDb } from "@/lib/firebase";
import { clampIndex, findDeck, slideSrc } from "@/lib/decks";

/** 눌리면 화면이 움직이는 키. 자료가 떠 있는 동안에는 막는다 */
const SCROLL_KEYS = new Set([
  " ",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

/**
 * 강사가 자료를 띄우면 참가자 화면 전체를 덮는다.
 * 끄기 전까지 아래 화면을 누를 수 없다. 같이 보는 시간을 만들려는 것이다.
 */
export default function SlideOverlay() {
  const pathname = usePathname();
  const [deckId, setDeckId] = useState("");
  const [index, setIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      await ensureAnonAuth();
      if (cancelled) return;
      unsub = onSnapshot(doc(getDb(), "config", "slides"), (snap) => {
        const data = snap.data();
        setDeckId(typeof data?.deck === "string" ? data.deck : "");
        setIndex(typeof data?.index === "number" ? data.index : 0);
      });
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const deck = findDeck(deckId);
  // 강사 화면은 덮지 않는다. 자료를 넘기는 사람이 갇히면 끌 수도 없다.
  const showing = Boolean(deck) && !pathname?.startsWith("/teacher");

  // 덮는 동안에는 뒤 화면이 스크롤되지 않게 한다.
  // 화면을 가리는 것만으로는 부족하다. Tab 으로 아래 버튼에 닿을 수 있어
  // inert 로 통째로 잠근다. 포커스도 이 화면으로 데려온다.
  useEffect(() => {
    if (!showing) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = document.getElementById("app-root");
    const wasFocused = document.activeElement as HTMLElement | null;
    root?.setAttribute("inert", "");
    panelRef.current?.focus();

    // inert 는 document 에 붙은 키 핸들러까지 막지 않는다. Esc 하나로
    // 튜터 창이나 모달이 반응할 수 있어 여기서 먼저 가로챈다.
    const swallow = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (SCROLL_KEYS.has(e.key)) e.preventDefault();
    };
    document.addEventListener("keydown", swallow, true);

    return () => {
      document.body.style.overflow = before;
      root?.removeAttribute("inert");
      document.removeEventListener("keydown", swallow, true);
      // 잠금을 푼 뒤에 돌려준다. 풀기 전에는 포커스가 들어가지 않는다.
      wasFocused?.focus?.();
    };
  }, [showing]);

  if (!deck || !showing) return null;

  const at = clampIndex(deck, index);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${deck.title} 슬라이드`}
      ref={panelRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-inverseCanvas"
      style={{ outline: "none" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
        <span className="caption text-inverseInk">{deck.title}</span>
        <span className="caption text-inverseInk">
          {at + 1} / {deck.count}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-4">
        {/* 다음 장을 미리 받아 둔다. 넘길 때 흰 화면이 스치지 않게 한다. */}
        {at + 1 < deck.count ? (
          <link rel="preload" as="image" href={slideSrc(deck, at + 1)} />
        ) : null}
        <img
          src={slideSrc(deck, at)}
          alt={`${deck.title} ${at + 1}번째 슬라이드`}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <p className="caption px-6 pb-4 text-inverseInk">
        강사가 넘기면 함께 넘어갑니다. 끝나면 이 화면이 사라집니다.
      </p>
    </div>
  );
}
