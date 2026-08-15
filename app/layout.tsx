import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "해커톤 베이스캠프",
  description: "2026 정보 교사 바이브 코딩 역량강화 워크숍",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto max-w-[1000px]">{children}</div>
      </body>
    </html>
  );
}
