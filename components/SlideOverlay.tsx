"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { ensureAnonAuth, getDb } from "@/lib/firebase";
import { clampIndex, findDeck, slideSrc } from "@/lib/decks";
import { lockRoot } from "@/lib/lockRoot";
import { POLICY_VERSION } from "@/lib/policy";
import { CONSENT_CHANGED, hasAgreed } from "@/lib/session";

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

  // 이 덮개는 서약 문지기 바깥에 산다. app-root 안에 두면 잠금에 걸려
  // 저 자신이 눌리지 않는다. 그래서 동의 여부를 직접 본다.
  // 이것이 없으면 서약을 읽는 동안 익명 로그인과 Firestore 구독이 먼저 시작된다.
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const read = () => setAllowed(hasAgreed(POLICY_VERSION));
    read();
    window.addEventListener(CONSENT_CHANGED, read);
    return () => window.removeEventListener(CONSENT_CHANGED, read);
  }, []);

  useEffect(() => {
    // 나가기를 누르면 여기로 온다. 띄워 둔 자료를 내려 서약 화면을 가리지 않게 한다.
    if (!allowed) {
      setDeckId("");
      return;
    }
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
  }, [allowed]);

  const deck = findDeck(deckId);
  // 강사 화면은 덮지 않는다. 자료를 넘기는 사람이 갇히면 끌 수도 없다.
  // allowed 를 여기 넣어야 한다. 나가기 직후 자료를 내리는 효과가 돌기 전 한 프레임,
  // 남은 deck 이 서약 화면을 가린다.
  const showing = allowed && Boolean(deck) && !pathname?.startsWith("/teacher");

  // 덮는 동안에는 뒤 화면이 스크롤되지 않게 한다.
  // 화면을 가리는 것만으로는 부족하다. Tab 으로 아래 버튼에 닿을 수 있어
  // inert 로 통째로 잠근다. 포커스도 이 화면으로 데려온다.
  useEffect(() => {
    if (!showing) return;
    const wasFocused = document.activeElement as HTMLElement | null;
    // 서약 팝업과 함께 뜰 수 있다. 잠금은 한 곳에서 세어 마지막이 놓을 때만 푼다.
    const unlock = lockRoot();
    panelRef.current?.focus();

    // inert 는 document 에 붙은 키 핸들러까지 막지 않는다. Esc 하나로
    // 튜터 창이나 모달이 반응할 수 있어 여기서 먼저 가로챈다.
    const swallow = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (SCROLL_KEYS.has(e.key)) e.preventDefault();
    };
    document.addEventListener("keydown", swallow, true);

    return () => {
      unlock();
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
        {/* 자료 제목은 분류 라벨이 아니라 내용이다. Git 이 GIT 이 되면 안 된다. */}
        <span className="caption normal-case text-inverseInk">{deck.title}</span>
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
