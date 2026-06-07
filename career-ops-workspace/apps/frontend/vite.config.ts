import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // 상위 폴더(모노레포 루트)의 백엔드 파일 접근을 허용하여 RPC 타입 연동을 지원합니다.
      allow: ['..']
    }
  }
})
