import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 브랜드와 신호
        brand: "#e60012", // 닌텐도 레드
        signal: "#f68d1f", // 전진, 제출
        amber: "#ecab37", // 도구 버튼, 배지
        navGold: "#e48600", // 상단 메뉴 글자

        // 크롬 표면
        canvas: "#7a8aba", // 페리윙클 본체
        canvasSoft: "#9fbee7", // 보조 바, 밝은 인셋
        lavender: "#acace7", // 히어로 필드
        ice: "#c0d5e6",
        periwinkle: "#8ba1d4", // 한 단 올라온 패널
        chromeIndigo: "#3d4f97", // 베벨 그림자선
        mutedIndigo: "#60619c", // 비활성 크롬
        platinum: "#dedede", // 목록 행
        surface: "#ffffff",
        carbon: "#21242e", // 명령 레이어
        hairline: "#5a5f8c",

        // 글자
        ink: "#21242e",
        inkSoft: "#3d4f97",

        // 페이지 색조
        systemsTeal: "#206479",
        gamesRed: "#a7282b",
      },
    },
  },
  plugins: [],
};
export default config;
