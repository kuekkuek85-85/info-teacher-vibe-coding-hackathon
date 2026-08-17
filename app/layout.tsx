import type { Metadata } from "next";
import AttendPing from "@/components/AttendPing";
import ConsentGuard from "@/components/ConsentGuard";
import Footer from "@/components/Footer";
import SlideOverlay from "@/components/SlideOverlay";
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
        {/* 자료가 떠 있는 동안 이 안쪽을 통째로 잠근다. 마우스도 키보드도 닿지 않는다. */}
        {/* 서약을 받기 전에는 참가자 화면을 그리지 않는다. 주소를 직접 쳐도 마찬가지다. */}
        <div id="app-root">
          <ConsentGuard>
            {children}
            <Footer />
            {/* 어느 화면으로 돌아와도 오늘 왔다는 표시를 한 번 찍는다. */}
            <AttendPing />
          </ConsentGuard>
        </div>
        {/* 강사가 자료를 띄우면 어느 화면에 있든 덮는다. */}
        <SlideOverlay />
      </body>
    </html>
  );
}
