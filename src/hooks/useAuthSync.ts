/**
 * 认证同步 Hook
 *
 * 重写自课表 initService.js：
 * - 用户登录后触发数据加载
 * - 60s 定期会话检查
 * - 24h 自动登出
 * - onAuthStateChange 监听
 * - 页面可见性变化时暂停/恢复检查
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/stores/useStore';
import { getSession, onAuthStateChange, logout as authLogout } from '@/lib/auth';
import { loadData, initDataSave, cleanupRealtime, cleanupDataSave } from '@/lib/data';

const SESSION_CHECK_INTERVAL = 60 * 1000; // 60s
const MAX_SESSION_HOURS = 24; // 24h 自动登出
const LOGIN_TIME_KEY = 'kb-login-time';

export function useAuthSync(): void {
  const { user, setUser, logout } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 用户登录/登出时：加载数据 + 初始化保存监听
  useEffect(() => {
    if (user) {
      // 登录：记录登录时间 + 加载数据 + 初始化保存
      localStorage.setItem(LOGIN_TIME_KEY, Date.now().toString());
      loadData(user.id);
      initDataSave();
    } else {
      // 登出：清理
      cleanupRealtime();
      cleanupDataSave();
      localStorage.removeItem(LOGIN_TIME_KEY);
      useStore.getState().setDataLoaded(false);
      useStore.getState().setSyncStatus('loggedout');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 会话检查：60s 定期检查 + 24h 自动登出
  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      if (document.hidden) return;

      try {
        const session = await getSession();
        if (!session) {
          // 会话失效
          localStorage.removeItem(LOGIN_TIME_KEY);
          logout();
          return;
        }

        // 24h 自动登出
        const loginTime = localStorage.getItem(LOGIN_TIME_KEY);
        if (loginTime) {
          const hoursSinceLogin = (Date.now() - parseInt(loginTime, 10)) / (1000 * 60 * 60);
          if (hoursSinceLogin > MAX_SESSION_HOURS) {
            await authLogout();
            localStorage.removeItem(LOGIN_TIME_KEY);
            logout();
          }
        }
      } catch {
        // 忽略检查错误
      }
    };

    intervalRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        if (!intervalRef.current) {
          intervalRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // onAuthStateChange：监听 Supabase 认证状态变化
  useEffect(() => {
    const { data } = onAuthStateChange((event: string, session: unknown) => {
      const s = session as any;
      if (event === 'SIGNED_OUT') {
        // 防抖 500ms，避免短暂状态变化误触发
        setTimeout(() => {
          localStorage.removeItem(LOGIN_TIME_KEY);
          setUser(null);
        }, 500);
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
