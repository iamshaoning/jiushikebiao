import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// 部署到 GitHub Pages 时需将 base 改为对应仓库名（如 '/jiushikebiao-new/'）
// 当前用相对路径，兼容任意子路径部署；HashRouter 对 base 不敏感
export default defineConfig({
  base: './',
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react(),
    tsconfigPaths()
  ],
})
