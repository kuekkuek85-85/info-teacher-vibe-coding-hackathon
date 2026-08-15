import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#090909",
        surface1: "#141414",
        surface2: "#1c1c1c",
        ink: "#ffffff",
        inkMuted: "#999999",
        accentBlue: "#0099ff",
        gViolet: "#6a4cf5",
        gMagenta: "#d44df0",
        gCoral: "#ff5577",
        success: "#22c55e",
        hairline: "#262626",
        hairlineSoft: "#1a1a1a",
      },
    },
  },
  plugins: [],
};
export default config;
