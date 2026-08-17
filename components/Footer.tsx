import Link from "next/link";

/** 어느 화면에서나 약관을 다시 읽을 수 있게 둔다 */
export default function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-8">
        <span className="caption">2026 정보 교사 바이브 코딩 역량강화 워크숍</span>
        <Link href="/terms" className="link-strong body-sm">
          이용약관
        </Link>
        <Link href="/privacy" className="link-strong body-sm">
          개인정보처리방침
        </Link>
      </div>
    </footer>
  );
}
