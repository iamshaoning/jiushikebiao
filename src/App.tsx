import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { useAuthSync } from '@/hooks/useAuthSync';
import Layout from '@/components/Layout';

import AuthPage from '@/pages/AuthPage';
import Calendar from '@/pages/Calendar';
import Students from '@/pages/Students';
import Statistics from '@/pages/Statistics';

/** 仅判登录，无角色限制 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return <>{children}</>;
}

// 嵌套路由：Layout 包裹 Outlet，子路由切换时 Layout 不重挂，保证菜单滑动指示器与侧边栏稳定
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Routes location={location}>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* 课表路由组（单角色，仅判登录） */}
      <Route
        path="/calendar"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Calendar />} />
      </Route>
      <Route
        path="/students"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Students />} />
      </Route>
      <Route
        path="/statistics"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Statistics />} />
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
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}
