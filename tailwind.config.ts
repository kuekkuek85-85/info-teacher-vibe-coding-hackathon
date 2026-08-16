import type { Config } from "tailwindcss";

const config: Config = {
  // lib 도 훑는다. 색 블록 클래스 이름을 데이터로 들고 있는 파일이 여기 있다.
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 흑백이 시스템의 뼈대다
        ink: "#000000",
        canvas: "#ffffff",
        inverseCanvas: "#000000",
        inverseInk: "#ffffff",
        hairline: "#e6e6e6",
        hairlineSoft: "#f1f1f1",
        surfaceSoft: "#f7f7f5",

        // 이야기를 나누는 파스텔 색 블록
        blockLime: "#dceeb1",
        blockLilac: "#c5b0f4",
        blockCream: "#f4ecd6",
        blockPink: "#efd4d4",
        blockMint: "#c8e6cd",
        blockCoral: "#f3c9b6",
        blockNavy: "#1f1d3d",

        // 한 페이지에 한 번만 쓰는 프로모 핑크
        magenta: "#ff3d8b",
        success: "#1ea64a",
      },
      borderRadius: {
        block: "24px",
        panel: "32px",
        pill: "50px",
      },
    },
  },
  plugins: [],
};
export default config;
