import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, useEffect, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { useAuthSync } from '@/hooks/useAuthSync';
import Layout from '@/components/Layout';

import AuthPage from '@/pages/AuthPage';

// 页面级代码分割：登录页保持同步加载，登录后的三个页面按需加载
const Calendar = lazy(() => import('@/pages/Calendar'));
const Students = lazy(() => import('@/pages/Students'));
const Statistics = lazy(() => import('@/pages/Statistics'));

/** 仅判登录，无角色限制 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return <>{children}</>;
}

// 嵌套路由：Layout 作为无路径布局路由包裹 Outlet，
// 子页面切换时 Layout 不重挂，保证菜单滑动指示器与侧边栏稳定
function AnimatedRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* 课表路由组（单角色，仅判登录） */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/students" element={<Students />} />
        <Route path="/statistics" element={<Statistics />} />
      </Route>

      <Route path="/" element={<Navigate to="/calendar" replace />} />
      <Route path="*" element={<Navigate to="/calendar" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

/** App 内容：在 AuthProvider 内调用 useAuthSync，触发数据加载/会话检查 */
function AppContent() {
  useAuthSync();
  const { user } = useAuth();

  // 登录后在浏览器空闲时预取其他页面分包，避免首次切换页面出现加载态
  useEffect(() => {
    if (!user) return;
    const prefetch = () => {
      void import('@/pages/Students');
      void import('@/pages/Statistics');
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(prefetch, 1200);
    return () => clearTimeout(timer);
  }, [user?.id]);

  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}
