"use client";

import Link from "next/link";

export default function TopNav({
  name,
  role,
  onLeave,
  notice,
}: {
  name?: string | null;
  role?: string | null;
  onLeave?: () => void;
  /** 헤더에 붙여 함께 고정할 경고. 스크롤해도 절대 가려지지 않는다. */
  notice?: string;
}) {
  return (
    <header className="sticky top-0 z-20">
      {/* 명령 레이어. 금색 메뉴 글자가 카본 위에서 빛난다.
          버튼이 44px 이라 바 높이를 고정하지 않고 내용에 맞춘다. */}
      <div className="slab">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1">
          <Link
            href="/"
            className="bg-surface px-3 py-[3px] text-brand"
            style={{ borderRadius: 9999 }}
          >
            <span className="nav-link">베이스캠프</span>
          </Link>
          <Link href="/plaza" className="nav-link py-2 text-navGold hover:text-amber">
            광장
          </Link>
          <Link href="/making" className="nav-link py-2 text-navGold hover:text-amber">
            만든 과정
          </Link>

          {name ? (
            <div className="ml-auto flex items-center gap-2">
              <span className="chrome-label text-white">
                {name}
                {role === "staff" ? " · 강사" : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm("나가시겠습니까? 제출물은 그대로 남습니다.")) onLeave?.();
                }}
                className="btn-amber"
              >
                나가기
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* 보조 바. 창백한 하늘색 띠가 명령 레이어를 받친다. */}
      <div className="bg-canvasSoft" style={{ borderBottom: "1px solid #3d4f97" }}>
        <div className="mx-auto max-w-[1000px] px-3 py-1">
          <span className="chrome-label text-ink">
            2026 정보 교사 바이브 코딩 역량강화 워크숍
          </span>
        </div>
      </div>

      {/* 경고는 헤더 스택 안에 둔다. 바깥에서 top 값을 계산하면
          헤더 높이가 바뀔 때마다 가려진다. */}
      {notice ? (
        <div
          className="bg-amber"
          style={{ borderTop: "1px solid #f6d08a", borderBottom: "2px solid #9a6a12" }}
        >
          <div className="mx-auto max-w-[1000px] px-3 py-1">
            <span className="chrome-label text-carbon">{notice}</span>
          </div>
        </div>
      ) : null}
    </header>
  );
}
