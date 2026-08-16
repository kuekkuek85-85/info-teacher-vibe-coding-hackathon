"use client";

import Link from "next/link";

export default function TopNav({
  name,
  role,
  onLeave,
  notice,
  action,
}: {
  name?: string | null;
  role?: string | null;
  onLeave?: () => void;
  /** 헤더에 붙여 함께 고정할 경고. 스크롤해도 절대 가려지지 않는다. */
  notice?: string;
  /** 로고 옆 왼쪽 자리. 막혔어요처럼 어디서든 눌러야 하는 것을 둔다 */
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20">
      <div className="border-b border-hairline bg-canvas">
        {/* 좁은 화면에서는 메뉴를 접어 두고 알약만 남긴다. 여는 장치는
            details/summary 라 자바스크립트 없이도 열린다. */}
        {/* 좁은 화면에서는 줄을 바꾼다. 안 바꾸면 글자가 세로로 뭉개진다. */}
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-2 px-6 py-2">
          <Link href="/" className="headline whitespace-nowrap">
            베이스캠프
          </Link>

          {/* 막혔어요는 여기 선다. 떠 있게 두면 스크롤할 때 본문을 덮는다. */}
          {action}

          <nav className="hidden items-center gap-5 min-[1040px]:flex">
            <Link href="/plaza" className="link-strong body-sm py-2">
              광장
            </Link>
            <Link href="/cases" className="link-strong body-sm py-2">
              강사 수업 사례
            </Link>
            <Link href="/making" className="link-strong body-sm py-2">
              이 웹 앱을 만든 과정
            </Link>
          </nav>

          <details className="relative ml-auto min-[1040px]:hidden">
            <summary className="btn-secondary cursor-pointer list-none">메뉴</summary>
            <div className="card absolute right-0 top-[52px] w-[220px] p-4">
              <Link href="/plaza" className="link-strong body-sm block py-2">
                광장
              </Link>
              <Link href="/cases" className="link-strong body-sm block py-2">
                강사 수업 사례
              </Link>
              <Link href="/making" className="link-strong body-sm block py-2">
                이 웹 앱을 만든 과정
              </Link>
            </div>
          </details>

          {name ? (
            <div className="flex items-center gap-3 min-[1040px]:ml-auto">
              <span className="caption hidden min-[560px]:inline">
                {name}
                {role === "staff" ? " · 강사" : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm("나가시겠습니까? 제출물은 그대로 남습니다.")) onLeave?.();
                }}
                className="btn-secondary"
              >
                나가기
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* 경고는 헤더 스택 안에 둔다. 바깥에서 top 값을 계산하면
          헤더 높이가 바뀔 때마다 가려진다. */}
      {notice ? (
        <div className="bg-inverseCanvas">
          <div className="mx-auto max-w-[1280px] px-6 py-2">
            <span className="caption text-inverseInk">{notice}</span>
          </div>
        </div>
      ) : null}
    </header>
  );
}
