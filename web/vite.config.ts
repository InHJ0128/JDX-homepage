import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://jdx.kr",    // 내 서버(리눅스)의 주소
        changeOrigin: true,
        secure: false,
        // rewrite는 완전히 제거!
        cookieDomainRewrite: "localhost",
        cookiePathRewrite: "/",

      },
      '/uploads': {
        target: "https://jdx.kr",
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [react()],
});