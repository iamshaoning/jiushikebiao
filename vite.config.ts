import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// 部署到 GitHub Pages 时需将 base 改为对应仓库名（如 '/jiushikebiao-new/'）
// 当前用相对路径，兼容任意子路径部署；HashRouter 对 base 不敏感
export default defineConfig({
  base: './',
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // 依赖按体积/更新频率拆分，页面本身由路由级 dynamic import 分包
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  plugins: [
    react(),
    tsconfigPaths()
  ],
})
