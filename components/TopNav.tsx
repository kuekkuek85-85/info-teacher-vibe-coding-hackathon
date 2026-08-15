"use client";

import Link from "next/link";

export default function TopNav({
  name,
  role,
  onLeave,
}: {
  name?: string | null;
  role?: string | null;
  onLeave?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 h-14 bg-canvas">
      <div className="mx-auto flex h-14 max-w-[1199px] items-center justify-between px-5">
        <Link href="/" className="text-sm font-medium tracking-[-0.02em]">
          해커톤 베이스캠프
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/plaza" className="px-3 py-2 text-inkMuted hover:text-ink">
            광장
          </Link>
          <Link href="/making" className="px-3 py-2 text-inkMuted hover:text-ink">
            만든 과정
          </Link>
          {name ? (
            <button
              type="button"
              onClick={onLeave}
              className="btn-secondary"
              title="누르면 나갑니다"
            >
              {name}
              {role === "staff" ? " · 강사" : ""}
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
