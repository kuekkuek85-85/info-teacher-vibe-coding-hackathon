"use client";

import { useEffect, useRef } from "react";

/**
 * 화면을 덮는 대화상자. 키보드만 쓰는 사람도 빠져나올 수 있어야 한다.
 * 열리면 안으로 포커스를 옮기고, Escape 로 닫히며, Tab 이 밖으로 새지 않는다.
 */
export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  // 부모가 인라인 함수를 넘기면 렌더마다 바뀐다. 실시간 구독이 도는 화면에서는
  // 그때마다 효과가 다시 돌아 포커스가 패널로 튕겨 나간다. 참조로 붙잡아 둔다.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    opener.current = document.activeElement;
    panel.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;

      const focusable = [
        ...panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) {
        e.preventDefault();
        panel.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = panel.current.contains(active);

      // 패널 자체에 포커스가 있을 때(막 열린 직후)도 밖으로 새지 않게 잡는다.
      if (!inside || active === panel.current) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={() => closeRef.current()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="card max-h-[80vh] w-full max-w-2xl overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
