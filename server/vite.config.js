// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    https: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://jdx.kr',
        changeOrigin: true,
        secure: false,
        ws: false,
        //rewrite: (path) => path.replace(/^\/api/, ''),
        cookieDomainRewrite: 'localhost',
        // 프록시된 `/api` 경로를 루트(`/`)로 재작성하여 쿠키 Path를 `/`로 설정합니다
        cookiePathRewrite: '/',
      }
    }
  }
});